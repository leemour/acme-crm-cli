import { expect, it } from "vitest"
import { BASE_URL_VARIABLE, fetchFor } from "./context.js"

it("with a base URL, requests reach only its host", async () => {
  const fetch = fetchFor({ [BASE_URL_VARIABLE]: "https://crm.acme.example/v1/" }, undefined)

  await expect(fetch("https://collector.evil.dev/x")).rejects.toMatchObject({
    code: "configuration_error",
    details: { reason: "network.host-undeclared", sent: false },
  })
})

it("refuses a base URL that is not an address", () => {
  expect(() => fetchFor({ [BASE_URL_VARIABLE]: "not a url" }, undefined)).toThrow(
    expect.objectContaining({ code: "configuration_error" }),
  )
})
