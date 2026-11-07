import type { Pacer } from "@wirecat/cli-core/sends"
import * as v from "valibot"
import { expect, it } from "vitest"
import { acmeApi } from "./api.js"
import { FAKE_TOKEN, fakeAcme } from "./fake.js"
import { failureOf, transport } from "./transport.js"

const anything = v.unknown()
const failing = (error: unknown) => async () => Promise.reject(error)
const timedOut = () => new DOMException("timed out", "TimeoutError")

it.each([
  [401, "authentication_error"],
  [404, "not_found"],
  [429, "rate_limited"],
  [503, "provider_unavailable"],
  [400, "validation_error"],
])("HTTP %i is %s", (status, code) => {
  expect(failureOf(status).code).toBe(code)
})

it("a rate limit carries the wait the service asked for", () => {
  expect(failureOf(429, 2000).details).toMatchObject({ retryable: true, retry_after_ms: 2000 })
})

it("sends the token in the Authorization header only, and refuses a redirect", async () => {
  const service = fakeAcme()
  const sent: RequestInit[] = []
  await acmeApi(
    transport({
      token: FAKE_TOKEN,
      fetch: (input, init = {}) => {
        sent.push(init)
        return service.fetch(input, init)
      },
    }),
  ).me()
  expect(service.calls[0]?.url).not.toContain(FAKE_TOKEN)
  expect(service.calls[0]?.headers.authorization).toBe(`Bearer ${FAKE_TOKEN}`)
  expect(sent[0]?.redirect).toBe("error")
})

it("the fake refuses a token that is not a synthetic acme_test_ one", async () => {
  const service = fakeAcme()
  await expect(acmeApi(transport({ token: "real-looking", fetch: service.fetch })).me()).rejects.toMatchObject({
    code: "authentication_error",
  })
})

it("a base URL sends the request there instead of the fake's address", async () => {
  const urls: string[] = []
  const fetch = async (input: string | URL | Request) => {
    urls.push(String(input))
    return new Response(JSON.stringify({ pipelines: [] }), { status: 200 })
  }
  await acmeApi(transport({ token: FAKE_TOKEN, baseUrl: "http://127.0.0.1:9/v1/", fetch })).pipelines()
  expect(urls).toEqual(["http://127.0.0.1:9/v1/pipelines"])
})

it('refuses an id of "." or ".." before any request, since it would reach another endpoint', async () => {
  const service = fakeAcme()
  await expect(acmeApi(transport({ token: FAKE_TOKEN, fetch: service.fetch })).person("..")).rejects.toMatchObject({
    code: "validation_error",
  })
  expect(service.calls).toEqual([])
})

it("a read that got no answer is a retryable timeout or network error", async () => {
  const get = (error: unknown) => transport({ token: FAKE_TOKEN, fetch: failing(error) }).get({ path: "me" }, anything)
  await expect(get(timedOut())).rejects.toMatchObject({ code: "timeout", details: { retryable: true } })
  await expect(get(new TypeError("fetch failed"))).rejects.toMatchObject({ code: "network_error" })
})

it("a stop during a read cancels it", async () => {
  const stop = new AbortController()
  stop.abort()
  const get = transport({ token: FAKE_TOKEN, fetch: failing(new Error("aborted")), signal: stop.signal }).get(
    { path: "me" },
    anything,
  )
  await expect(get).rejects.toMatchObject({ code: "cancelled" })
})

it("an answer that is not JSON, or in another shape, is invalid_response", async () => {
  const html = async () => new Response("<html>", { status: 200 })
  const other = async () => new Response(JSON.stringify({ unexpected: true }), { status: 200 })
  for (const fetch of [html, other])
    await expect(acmeApi(transport({ token: FAKE_TOKEN, fetch })).me()).rejects.toMatchObject({
      code: "invalid_response",
    })
})

it("waits its turn under the profile's pace, and ends the run instead of a long wait", async () => {
  const service = fakeAcme()
  const waits: number[] = []
  const paced = (at: number) =>
    acmeApi(
      transport({
        token: FAKE_TOKEN,
        fetch: service.fetch,
        now: () => 1_000,
        pacer: { reserve: async () => at } as unknown as Pacer,
        sleep: async (ms) => {
          waits.push(ms)
        },
      }),
    ).me()
  await paced(1_500)
  expect(waits).toEqual([500])
  await expect(paced(1_000 + 120_000)).rejects.toMatchObject({ code: "rate_limited" })
  expect(service.calls).toHaveLength(1)
})
