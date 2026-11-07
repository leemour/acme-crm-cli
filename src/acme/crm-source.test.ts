import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { crmSourceContract, crmSyncContract } from "@wirecat/cli-core/crm/testing"
import { type MessageStore, openStore } from "@wirecat/cli-core/store"
import { afterEach, describe, expect, it } from "vitest"
import { acmeApi } from "./api.js"
import { acmeCrmSource, PROVIDER } from "./crm-source.js"
import { FAKE_TOKEN, fakeAcme } from "./fake.js"
import { transport } from "./transport.js"

const sourceOver = (service = fakeAcme()) =>
  acmeCrmSource(() => acmeApi(transport({ token: FAKE_TOKEN, fetch: service.fetch })))

const stores: MessageStore[] = []
afterEach(async () => {
  for (const store of stores.splice(0)) await store.close()
})

describe("crmSourceContract over the Acme fake", () => {
  for (const { name, run } of crmSourceContract(() => ({
    source: sourceOver(),
    deadCursor: { kind: "deal", cursor: "not a time" },
  })))
    it(name, run)
})

describe("crmSyncContract over a temporary store", () => {
  for (const { name, run } of crmSyncContract(async () => {
    const store = await openStore({ path: join(mkdtempSync(join(tmpdir(), "acme-sync-")), "store.db") })
    stores.push(store)
    return { store, account: { provider: PROVIDER, account: "acme-demo" } }
  }))
    it(name, run)
})

it("a cursor reads only what changed after it, and the last page gives the next cursor", async () => {
  const source = sourceOver()
  const full = await source.changes("deal", null)
  expect(full).toMatchObject({ cursor: "2026-10-16T09:00:00Z" })
  expect("items" in full && full.items).toHaveLength(15)
  const later = await source.changes("deal", "2026-10-14T09:00:00Z")
  expect("items" in later && later.items.map((item) => item.externalId)).toEqual(["deal_14", "deal_15"])
  expect(await source.pipelines("lead")).toEqual([])
  expect(await source.changes("lead", null)).toEqual({ items: [], cursor: null })
})
