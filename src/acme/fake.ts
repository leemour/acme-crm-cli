import { type Dataset, dataset } from "./data.js"
import { FAKE_URL } from "./transport.js"

// The Acme CRM service does not exist: this strict fake is it. The CLI talks to it whenever ACME_CRM_BASE_URL is
// unset, and the tests talk to it always. It refuses an unknown path, parameter or token, as a real API would.

/** Spelled so gitleaks lets it through; the fake takes any token of this shape and nothing else. */
export const FAKE_TOKEN = "acme_test_demo"
const TOKEN_SHAPE = /^acme_test_[a-z0-9_]{1,64}$/

export interface FakeCall {
  path: string
  query: Record<string, string>
  url: string
  headers: Record<string, string>
}

export interface FakeOptions {
  data?: Dataset
  /** Every request is answered with this status. */
  failWith?: number
  /** No request is answered; each fails only when the caller stops waiting. */
  hang?: boolean
}

interface Answer {
  status: number
  body: unknown
}

const LIST_QUERY = ["limit", "page_token", "updated_since"]
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

const refused = (error: string, detail: string): Answer => ({ status: 400, body: { error, detail } })

const listed = <T extends { updated_at: string }>(all: T[], query: Record<string, string>): Answer => {
  const since = query.updated_since
  if (since !== undefined && !ISO.test(since)) return refused("invalid_updated_since", since)
  const limit = Number(query.limit ?? 50)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return refused("invalid_limit", String(query.limit))
  const offset = Number(query.page_token ?? 0)
  if (!Number.isInteger(offset) || offset < 0) return refused("invalid_page_token", String(query.page_token))
  const matching = all.filter(
    (one) =>
      (since === undefined || one.updated_at > since) &&
      (query.organization_id === undefined ||
        ("organization_id" in one && one.organization_id === query.organization_id)),
  )
  const page = matching.slice(offset, offset + limit)
  const newest = [since ?? "", ...all.map((one) => one.updated_at)].sort().at(-1)
  return {
    status: 200,
    body: {
      data: page,
      next_page_token: offset + limit < matching.length ? String(offset + limit) : null,
      deleted_ids: [],
      sync_token: newest || null,
    },
  }
}

const found = <T extends { id: string }>(all: T[], id: string): Answer => {
  const one = all.find((item) => item.id === id)
  return one ? { status: 200, body: one } : { status: 404, body: { error: "not_found" } }
}

/** The service, answering through `fetch`. `calls` holds every request it got. */
export const fakeAcme = (options: FakeOptions = {}) => {
  const data = options.data ?? dataset()
  const calls: FakeCall[] = []
  const host = new URL(FAKE_URL).host

  const routes: {
    path: RegExp
    query: readonly string[]
    answer: (id: string, query: Record<string, string>) => Answer
  }[] = [
    {
      path: /^\/v1\/me$/,
      query: [],
      answer: () => ({ status: 200, body: { user: data.user, workspace: data.workspace } }),
    },
    { path: /^\/v1\/pipelines$/, query: [], answer: () => ({ status: 200, body: { pipelines: data.pipelines } }) },
    { path: /^\/v1\/organizations$/, query: LIST_QUERY, answer: (_, q) => listed(data.organizations, q) },
    { path: /^\/v1\/organizations\/([^/]+)$/, query: [], answer: (id) => found(data.organizations, id) },
    { path: /^\/v1\/people$/, query: [...LIST_QUERY, "organization_id"], answer: (_, q) => listed(data.people, q) },
    { path: /^\/v1\/people\/([^/]+)$/, query: [], answer: (id) => found(data.people, id) },
    { path: /^\/v1\/deals$/, query: LIST_QUERY, answer: (_, q) => listed(data.deals, q) },
    { path: /^\/v1\/invoices$/, query: LIST_QUERY, answer: (_, q) => listed(data.invoices, q) },
  ]

  const reply = (call: FakeCall, method: string): Answer => {
    const token = call.headers.authorization?.replace(/^Bearer /, "") ?? ""
    if (!TOKEN_SHAPE.test(token)) return { status: 401, body: { error: "unauthorized" } }
    if (options.failWith) return { status: options.failWith, body: { error: "scripted" } }
    const route = routes.find((one) => one.path.test(call.path))
    if (method !== "GET" || !route) return refused("unknown_endpoint", `${method} ${call.path}`)
    const unknown = Object.keys(call.query).find((key) => !route.query.includes(key))
    if (unknown) return refused("unknown_parameter", unknown)
    return route.answer(decodeURIComponent(call.path.match(route.path)?.[1] ?? ""), call.query)
  }

  const fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input)
    const call: FakeCall = {
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      url: url.href,
      headers: Object.fromEntries(new Headers(init.headers).entries()),
    }
    calls.push(call)
    if (url.host !== host) throw new TypeError("fetch failed")
    if (options.hang)
      return new Promise((_, reject) =>
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true }),
      )
    const answered = reply(call, init.method ?? "GET")
    return new Response(JSON.stringify(answered.body), {
      status: answered.status,
      headers: { "content-type": "application/json" },
    })
  }

  return { fetch: fetch as typeof globalThis.fetch, calls, data }
}
