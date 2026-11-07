import type { MessageStore } from "@wirecat/cli-core/store"
import { PROVIDER } from "./acme/crm-source.js"
import { IDENTITY } from "./identity.js"

/** Acme CRM is not built into cli-core, so every writable open registers it for other tools' search (WC-ARCH-21). */
export const PROVIDER_ENTRY = { name: PROVIDER, kind: "crm", aliases: ["acme"], command: IDENTITY.command } as const

/**
 * The shared store (`MESSAGING_STORE`, else WireCat's own file). A read-only open writes nothing, the provider entry
 * included, and fails when the file is missing or needs a migration.
 */
export const openAcmeStore = async (env: NodeJS.ProcessEnv, { readOnly = false } = {}): Promise<MessageStore> => {
  const { ensureSqlite } = await import("@wirecat/cli-core/sqlite-runtime")
  await ensureSqlite()
  const { openStore, storePath } = await import("@wirecat/cli-core/store")
  const store = await openStore({
    path: storePath(env),
    env,
    command: IDENTITY.command,
    version: IDENTITY.version,
    ...(readOnly ? { readOnly } : {}),
  })
  try {
    if (!readOnly) await store.accounts.registerProvider(PROVIDER_ENTRY)
    return store
  } catch (error) {
    await store.close()
    throw error
  }
}
