import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { brokenKeyring, memoryKeyring } from "@wirecat/cli-base"
import type { RunOptions } from "@wirecat/cli-core/cli"
import { mcpOverStdio } from "@wirecat/cli-core/testing"
import { afterEach, expect, it } from "vitest"
import { FAKE_TOKEN, fakeAcme } from "./acme/fake.js"
import type { ServiceEnvironment } from "./context.js"
import { run } from "./program.js"
import { runCli, signedIn } from "./testing/harness.js"
import { holdsToken } from "./token.js"

const configFile = join(process.env.ACME_CRM_CONFIG_DIR ?? "", "config.json")
const withPermissions = (permissions: Record<string, string>) => {
  mkdirSync(join(configFile, ".."), { recursive: true })
  writeFileSync(configFile, JSON.stringify({ profiles: { personal: { permissions } } }))
}
afterEach(() => rmSync(configFile, { force: true }))

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((name) => join(dir, name))
    .filter((path) => statSync(path).isFile())
it("a deny on a read stops it before any request", async () => {
  withPermissions({ "contacts.list": "deny" })
  const service = fakeAcme()
  const { code, json } = await runCli(["personal", "contacts", "list", "--json"], { service })
  expect(code).toBe(5)
  expect(json()).toMatchObject({ error: { code: "permission_error" } })
  expect(service.calls).toEqual([])
})

it("without a sign-in a command says how to sign in and sends nothing", async () => {
  const service = fakeAcme()
  const { json } = await runCli(["personal", "contacts", "list", "--json"], { service, keyring: memoryKeyring() })
  expect(json()).toMatchObject({ error: { code: "authentication_error" } })
  expect(JSON.stringify(json())).toContain("session start")
  expect(service.calls).toEqual([])
})

it("--offline refuses a command that needs the service", async () => {
  const service = fakeAcme()
  expect((await runCli(["--offline", "personal", "contacts", "list", "--json"], { service })).code).toBe(5)
  expect(service.calls).toEqual([])
})

it("a recorded run is named after the command and holds its request", async () => {
  const listed = await runCli(["--record", "personal", "contacts", "list", "--json"])
  const runId = String((listed.json().meta as Record<string, unknown>).run_id)
  expect(runId).toContain("contacts")
  expect(runId).not.toContain("-process-")
  expect((await runCli(["runs", "show", runId, "--json"])).out).toContain("GET /people")
})

it("session start reads the token from stdin and checks it before keeping it; status, list and end", async () => {
  const keyring = memoryKeyring()
  const service = fakeAcme()
  const started = await runCli(["personal", "session", "start", "--json"], { keyring, service, stdin: FAKE_TOKEN })
  expect(started.json().item).toMatchObject({ verified: true, user: { id: "usr_01" } })
  const status = await runCli(["personal", "session", "status", "--check", "--json"], { keyring, service })
  expect(status.json().item).toMatchObject({ state: "saved", token_from: "keyring", verified: true })
  expect((await runCli(["session", "list", "--json"], { keyring })).json().items).toContainEqual(
    expect.objectContaining({ profile: "personal", signed_in: true }),
  )
  expect((await runCli(["personal", "session", "end", "--json"], { keyring })).code).toBe(0)
  const ended = await runCli(["personal", "session", "status", "--json"], { keyring })
  expect(ended.json().item).toMatchObject({ state: "missing" })
})

it("session start --credential-storage file keeps the token in a private file instead of the keyring", async () => {
  const keyring = memoryKeyring()
  const started = await runCli(["personal", "session", "start", "--credential-storage", "file", "--json"], {
    keyring,
    stdin: FAKE_TOKEN,
  })
  expect(started.json().item).toMatchObject({ stored_in: "file" })
  const status = await runCli(["personal", "session", "status", "--json"], { keyring })
  expect(status.json().item).toMatchObject({ token_from: "file" })
  expect((await runCli(["personal", "session", "end", "--json"], { keyring })).json().item).toMatchObject({
    ended: expect.arrayContaining(["file"]),
  })
})

it("session start without a working keyring keeps the token in a private file, and says so on stderr", async () => {
  const keyring = brokenKeyring()
  const started = await runCli(["personal", "session", "start", "--json"], { keyring, stdin: FAKE_TOKEN })
  expect(started.json().item).toMatchObject({ stored_in: "file" })
  expect(started.err).toContain("keyring")
  expect(holdsToken(process.env, "personal", keyring)).toBe(true)
  expect((await runCli(["personal", "session", "end", "--json"], { keyring })).code).toBe(0)
  expect(holdsToken(process.env, "personal", keyring)).toBe(false)
})

it("session start refuses a storage it does not know, before asking for the token", async () => {
  const { code, err } = await runCli(["personal", "session", "start", "--credential-storage", "vault", "--json"])
  expect(code).toBe(2)
  expect(err).toContain("--credential-storage takes keyring or file")
})

it("the token reaches no address, output, run record or journal, whatever the outcome", async () => {
  const service = fakeAcme()
  const runs = [
    await runCli(["personal", "session", "start", "--json"], { keyring: memoryKeyring(), stdin: FAKE_TOKEN }),
    await runCli(["--record", "personal", "contacts", "list", "--json"], { service }),
    await runCli(["personal", "contacts", "show", "per_99", "--json"], { service }),
    await runCli(["--record", "personal", "sync", "--json"], { service }),
    await runCli(["personal", "contacts", "list", "--json"], { service: fakeAcme({ failWith: 401 }) }),
  ]
  for (const ran of runs) expect(ran.out + ran.err).not.toContain(FAKE_TOKEN)
  for (const call of service.calls) expect(call.url).not.toContain(FAKE_TOKEN)
  const folders = [...new Set([process.env.HOME ?? "", tmpdir()])]
  const written = folders.flatMap(filesUnder).map((path) => readFileSync(path, "utf8"))
  expect(written.some((text) => text.includes("GET /people"))).toBe(true)
  expect(written.filter((text) => text.includes(FAKE_TOKEN))).toEqual([])
})

it("mcp serve runs a read for an agent with the run's keyring", async () => {
  const service = fakeAcme()
  const options: RunOptions & ServiceEnvironment = { tty: false, keyring: signedIn(), fetch: service.fetch }
  const mcp = await mcpOverStdio((streams) => run(["personal", "mcp", "serve"], { ...options, ...streams }))
  try {
    const listed = await mcp.call("acme-crm_read", { command: "contacts show", arguments: { id: "per_02" } })
    expect(listed.body).toMatchObject({ item: { id: "per_02" } })
  } finally {
    expect(await mcp.close()).toBe(0)
  }
})
