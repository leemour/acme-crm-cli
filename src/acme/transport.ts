import { CliError, isCliError, realSleep, type SleepLike, wallClock } from "@wirecat/cli-base"
import { providerWaitMs, readJsonResponse, statusToCode } from "@wirecat/cli-base/http"
import { type EventSink, providerRequest } from "@wirecat/cli-core/cli"
import type { Pacer } from "@wirecat/cli-core/sends"
import * as v from "valibot"

/** Never resolves, so a run without `ACME_CRM_BASE_URL` can only reach the built-in fake. */
export const FAKE_URL = "https://acme-crm.example.invalid/v1/"
export const SERVICE = "Acme CRM"

const TIMEOUT_MS = 30_000
const LARGEST_ANSWER = 8 * 1024 * 1024
/** A pace wait longer than this ends the run with `rate_limited` instead of sitting in it. */
const LONGEST_PACE_WAIT_MS = 60_000

export interface Request {
  /** The path as a template, `people/{id}`: the run record keeps the template, never an id. */
  path: string
  ids?: Record<string, string>
  query?: Record<string, string | number | undefined>
}

export interface TransportOptions {
  token: string
  baseUrl?: string
  fetch: typeof fetch
  signal?: AbortSignal | undefined
  /** The run's sink from `baseContext(...).run(events => …)`, so each request lands in the run record (WC-LIFE-15). */
  events?: EventSink
  pacer?: Pacer
  sleep?: SleepLike
  now?: () => number
  timeoutMs?: number
}

/** `new URL` folds a `.` or `..` segment into its parent, so such an id would reach another endpoint. */
const segment = (name: string, value: string) => {
  if (value === "" || value === "." || value === "..")
    throw new CliError("validation_error", `${name} must name one item; an empty, "." or ".." id is refused`)
  return encodeURIComponent(value)
}

const urlOf = (base: string, { path, ids = {}, query = {} }: Request) => {
  const url = new URL(
    path.replace(/\{(\w+)\}/g, (_, name: string) => segment(name, ids[name] ?? "")),
    base,
  )
  for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, String(value))
  return url
}

/** The service's own message is never repeated: it can quote what was sent (WC-SECR-6). */
export const failureOf = (status: number, retryAfterMs?: number): CliError => {
  if (status === 401)
    return new CliError("authentication_error", `${SERVICE} refused the token; sign in again with session start`, {
      status,
    })
  if (status === 429)
    return new CliError("rate_limited", `${SERVICE} asked to slow down; retry the command later`, {
      status,
      retryable: true,
      ...(retryAfterMs === undefined ? {} : { retry_after_ms: retryAfterMs }),
    })
  if (status === 404) return new CliError("not_found", `${SERVICE} has no such item, or this token cannot see it`)
  return new CliError(statusToCode(status), `${SERVICE} refused the request (HTTP ${status})`, {
    status,
    retryable: status >= 500,
  })
}

/**
 * The only code that holds the token: it goes in the Authorization header, never in an address, an error or a run
 * record (WC-SECR-7). Every call is a read, and nothing here retries: the caller may run the command again.
 */
export const transport = (options: TransportOptions) => {
  const fetchOf = options.fetch
  const base = options.baseUrl ?? FAKE_URL
  const sleep = options.sleep ?? realSleep
  const now = options.now ?? Date.now

  const turn = async () => {
    if (!options.pacer) return
    const wait = (await options.pacer.reserve()) - now()
    if (wait <= 0) return
    if (wait > LONGEST_PACE_WAIT_MS)
      throw new CliError("rate_limited", `this profile must wait ${Math.ceil(wait / 1000)} s before its next request`, {
        retry_after_ms: wait,
      })
    await sleep(wait, options.signal, "retry")
  }

  const unanswered = (error: unknown): CliError => {
    if (options.signal?.aborted) return new CliError("cancelled", `the ${SERVICE} request was stopped`)
    const timedOut = (error as { name?: string } | undefined)?.name === "TimeoutError"
    return timedOut
      ? new CliError("timeout", `${SERVICE} did not answer in time`, { retryable: true })
      : new CliError("network_error", `${SERVICE} could not be reached`, { retryable: true })
  }

  const get = async <T>(request: Request, answer: v.GenericSchema<unknown, T>): Promise<T> => {
    const url = urlOf(base, request)
    await turn()
    // Not AbortSignal.timeout: its timer keeps the run's async context alive until it fires.
    const deadline = new AbortController()
    const timer = setTimeout(
      () => deadline.abort(new DOMException("timed out", "TimeoutError")),
      options.timeoutMs ?? TIMEOUT_MS,
    )
    timer.unref()
    const signal = options.signal ? AbortSignal.any([options.signal, deadline.signal]) : deadline.signal
    const end = providerRequest(`GET /${request.path}`, options.events, { method: "GET", transport: "http" })
    try {
      let response: Response
      try {
        response = await fetchOf(url, {
          method: "GET",
          headers: { authorization: `Bearer ${options.token}`, accept: "application/json" },
          // A redirect would carry the Authorization header to an address we did not choose.
          redirect: "error",
          signal,
        })
      } catch (error) {
        const failure = unanswered(deadline.signal.reason ?? error)
        end({ errorCode: failure.code })
        throw failure
      }
      if (!response.ok) {
        const failure = failureOf(response.status, providerWaitMs(response.headers, wallClock))
        end({ status: response.status, errorCode: failure.code })
        throw failure
      }
      let body: unknown
      try {
        body = await readJsonResponse(response, { maxBytes: LARGEST_ANSWER, signal })
      } catch (error) {
        const failure =
          isCliError(error) && error.code !== "invalid_response"
            ? error
            : new CliError("invalid_response", `${SERVICE} answered with something other than bounded JSON`)
        end({ status: response.status, errorCode: failure.code })
        throw failure
      }
      const parsed = v.safeParse(answer, body)
      if (!parsed.success) {
        end({ status: response.status, errorCode: "invalid_response" })
        throw new CliError("invalid_response", `${SERVICE}'s answer does not have the documented shape`)
      }
      end({ status: response.status })
      return parsed.output
    } finally {
      clearTimeout(timer)
    }
  }

  return { get }
}

export type Transport = ReturnType<typeof transport>
