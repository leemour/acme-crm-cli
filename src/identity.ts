import type { ManifestIdentity } from "@wirecat/cli-base/wcat/manifest"
import type { AppIdentity } from "@wirecat/cli-core/cli"
import { VERSION } from "./version.js"

export const PACKAGE = "@leemour/acme-crm-cli"

export const IDENTITY: AppIdentity = {
  command: "acme-crm",
  appName: "leemour-acme-crm-cli",
  envPrefix: "ACME_CRM",
  description: "an example third-party WireCat CLI for Acme CRM, a made-up service with synthetic data",
  version: VERSION,
  issues: "https://github.com/leemour/acme-crm-cli/issues/new",
  messenger: false,
  contentLanguages: ["en"],
}

// What `wcat` and WireCat Desktop show before the tool is installed. The bin passes it to wcatStart before anything
// else loads; src/wcat.ts adds the permission keys.
export const DESKTOP: ManifestIdentity = {
  ...IDENTITY,
  docs: "https://github.com/leemour/acme-crm-cli#readme",
  tagline: "Example CRM: Acme contacts, deals and invoices",
  syncs: "contacts, deals and invoices",
  signIn: {
    gives: "Lets your agent read the Acme CRM workspace: contacts, deals and invoices.",
    asks: "An Acme CRM API token. The example takes any acme_test_ token.",
  },
}

export const SKILL = new URL("../skills/leemour-acme-crm-cli/SKILL.md", import.meta.url)
