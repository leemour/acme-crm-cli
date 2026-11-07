import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { memoryKeyring } from "@wirecat/cli-base"
import { expect, it } from "vitest"
import { FAKE_TOKEN, fakeAcme } from "./acme/fake.js"
import { runCli } from "./testing/harness.js"

const REAL_STORE = join(homedir(), ".local", "share", "WireCat", "wirecat.db")

const signedInFresh = async () => {
  const keyring = memoryKeyring()
  const service = fakeAcme()
  const started = await runCli(["personal", "session", "start", "--json"], { keyring, service, stdin: FAKE_TOKEN })
  expect(started.code).toBe(0)
  expect(started.json().item).toMatchObject({ verified: true, workspace: { id: "acme-demo" } })
  return { keyring, service }
}

it("sync imports contacts and deals through the CRM port and invoices as proposals, into the test store", async () => {
  const store = process.env.MESSAGING_STORE ?? ""
  expect(store).not.toBe(REAL_STORE)
  const { keyring, service } = await signedInFresh()

  const first = await runCli(["personal", "sync", "--json"], { keyring, service })
  expect(first.code).toBe(0)
  expect(first.json().item).toMatchObject({
    provider: "acme-crm",
    account: "acme-demo",
    state: "complete",
    organizations: 10,
    people: 25,
    deals: 15,
    invoices: { created: 8, refused: 0, waiting: 0 },
    issues: [],
  })
  expect((first.json().item as { invoices: { proposed: string[] } }).invoices.proposed).toHaveLength(8)
  expect(existsSync(store)).toBe(true)

  const deals = await runCli(["personal", "deals", "list", "--json"], { keyring, service })
  expect(deals.code).toBe(0)
  const items = deals.json().items as { ref: string; title: string }[]
  expect(items).toHaveLength(15)
  const shown = await runCli(["personal", "deals", "show", items[0]?.ref ?? "", "--json"], { keyring, service })
  expect(shown.json().item).toMatchObject({ title: items[0]?.title })

  const won = await runCli(["personal", "deals", "list", "status:won", "--json"], { keyring, service })
  expect(won.json().items).toHaveLength(3)

  const again = await runCli(["personal", "sync", "--json"], { keyring, service })
  expect(again.json().item).toMatchObject({ deals: 0, invoices: { created: 0, unchanged: 8 } })

  for (const run of [first, deals, again]) expect(run.out + run.err).not.toContain(FAKE_TOKEN)
})

it("a store read before any session start says how to sign in", async () => {
  const read = await runCli(["fresh", "deals", "list", "--json"], { keyring: memoryKeyring() })
  expect(read.code).not.toBe(0)
  expect(read.json()).toMatchObject({ error: { code: "authentication_error" } })
})

it("sync with a token from the environment learns its workspace from the service", async () => {
  const sync = await runCli(["work", "sync", "--json"], {
    keyring: memoryKeyring(),
    env: { ACME_CRM_TOKEN: FAKE_TOKEN },
  })
  expect(sync.code).toBe(0)
  expect(sync.json().item).toMatchObject({ account: "acme-demo", state: "complete", issues: [] })
})

it("contacts list pages through people, and contacts show adds their organization", async () => {
  const page = await runCli(["personal", "contacts", "list", "--limit", "10", "--page", "3", "--json"])
  expect(page.code).toBe(0)
  expect(page.json()).toMatchObject({ page: { limit: 10, has_more: false } })
  expect(page.json().items).toHaveLength(5)

  const shown = await runCli(["personal", "contacts", "show", "per_01", "--json"])
  expect(shown.json().item).toMatchObject({
    id: "per_01",
    email: "ada.testova@example.com",
    organization: { id: "org_01", name: "Northwind Test Ltd" },
  })

  const missing = await runCli(["personal", "contacts", "show", "per_99", "--json"])
  expect(missing.json()).toMatchObject({ error: { code: "not_found" } })
})

it("session start refuses a token the service does not take, and keeps nothing", async () => {
  const keyring = memoryKeyring()
  const refused = await runCli(["personal", "session", "start", "--json"], { keyring, stdin: "not-a-test-token" })
  expect(refused.json()).toMatchObject({ error: { code: "authentication_error" } })
  const status = await runCli(["personal", "session", "status", "--json"], { keyring })
  expect(status.json().item).toMatchObject({ state: "missing" })
})
