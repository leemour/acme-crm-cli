import type { ManifestIdentity } from "@wirecat/cli-base/wcat/manifest"
import type { AppIdentity } from "@wirecat/cli-core/cli"
import { VERSION } from "./version.js"

export const PACKAGE = "@leemour/acme-crm-cli"

export const IDENTITY: AppIdentity = {
  command: "acme-crm",
  appName: "leemour-acme-crm-cli",
  envPrefix: "ACME_CRM",
  description: "a new WireCat CLI, started from cli-template",
  version: VERSION,
  issues: "https://github.com/leemour/acme-crm-cli/issues/new",
  messenger: false,
  contentLanguages: ["en"],
}

// What `wcat` and WireCat Desktop show before the tool is installed: rewrite the tagline and the sign-in texts for
// yours. The bin passes it to wcatStart before anything else loads; src/wcat.ts adds the permission keys.
export const DESKTOP: ManifestIdentity = {
  ...IDENTITY,
  docs: "https://github.com/leemour/acme-crm-cli#readme",
  tagline: "A new WireCat CLI, started from cli-template",
  signIn: {
    gives: "Lets your agent read and change your account through acme-crm.",
    asks: "An API token or key from the service.",
  },
}

export const SKILL = new URL("../skills/leemour-acme-crm-cli/SKILL.md", import.meta.url)
