import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describeProgram } from "@wirecat/cli-base/commands"
import { buildManifest, manifestSchema, manifestText } from "@wirecat/cli-base/wcat/manifest"
import { wcatStart } from "@wirecat/cli-base/wcat/start"
import * as v from "valibot"
import { describe, expect, it } from "vitest"
import { DESKTOP } from "./identity.js"
import { createProgram } from "./program.js"
import { WCAT } from "./wcat.js"

const MANIFEST = new URL("../contracts/wirecat.json", import.meta.url)

describe("WCAT", () => {
  it("builds a manifest WireCat Desktop accepts", () => {
    const manifest = buildManifest({
      identity: WCAT,
      commands: describeProgram(createProgram()),
      pkg: { name: "@leemour/acme-crm-cli", bin: { "wcat-acme-crm": "dist/bin/acme-crm.js" } },
      skills: true,
    })

    expect(v.safeParse(manifestSchema, manifest).issues).toBeUndefined()
    expect(manifest.desktop.tagline).toBe(WCAT.tagline)
  })
})

describe("the shipped manifest", () => {
  it("is what pnpm generate builds now, and names the data folder Desktop requires", () => {
    const manifest = buildManifest({
      identity: WCAT,
      commands: describeProgram(createProgram()),
      pkg: JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")),
      skills: true,
    })
    expect(readFileSync(MANIFEST, "utf8")).toBe(manifestText(manifest))
    expect(manifest.desktop.storage).toEqual({ app: "leemour-acme-crm-cli", env: "ACME_CRM" })
    expect(manifest.desktop.sync).toMatchObject({
      what: "contacts, deals and invoices",
      run: ["{profile}", "sync", "--record", "--json"],
    })
  })

  it("--wcat-describe answers format 2 with the manifest's hash", async () => {
    const out: string[] = []
    const bin = fileURLToPath(new URL("./bin/acme-crm.ts", import.meta.url))
    const started = await wcatStart(DESKTOP, {
      argv: ["node", bin, "--wcat-describe"],
      stdout: { write: (text: string) => out.push(text) },
    })
    expect(started.code).toBe(0)
    const answer = JSON.parse(out.join(""))
    expect(answer).toMatchObject({
      wcat_describe: 2,
      name: "acme-crm",
      desktop: { storage: { app: "leemour-acme-crm-cli" } },
    })
    expect(answer.manifest_sha256).toBe(createHash("sha256").update(readFileSync(MANIFEST)).digest("hex"))
  })
})
