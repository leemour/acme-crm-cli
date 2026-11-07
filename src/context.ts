import { readFileSync } from "node:fs"
import { CliError } from "@wirecat/cli-base"
import {
  accountFileFor,
  type BaseEnvironment,
  baseContext,
  type EventSink,
  environmentOf,
  type GlobalFlags,
} from "@wirecat/cli-core/cli"
import { Pacer, pacePathFor } from "@wirecat/cli-core/sends"
import type { Command } from "commander"
import { type AcmeApi, acmeApi } from "./acme/api.js"
import { fakeAcme } from "./acme/fake.js"
import { SERVICE, transport } from "./acme/transport.js"
import { configuration } from "./config.js"
import { IDENTITY } from "./identity.js"
import { tokenStore } from "./token.js"

/** What a test hands `run()` beside cli-core's own: the fake service in place of the network (WC-ARCH-10). */
export interface ServiceEnvironment extends BaseEnvironment {
  fetch?: typeof fetch
}

export const BASE_URL_VARIABLE = `${IDENTITY.envPrefix}_BASE_URL`

// Acme CRM is made up; this pace is the fake's, so the example shows where a real service's documented limit goes.
const PACE = { perMinute: 120, burst: 20 }

/**
 * Settings, keyring and the run come from cli-core's `baseContext` and nowhere else: a command that resolves settings
 * on its own skips `--timeout`, the run record and the profile's permissions (WC-LIFE-5, WC-LIFE-15).
 */
export const contextOf = (command: Command) => {
  const base = baseContext(command, configuration.resolveSettings)
  return {
    ...base,
    environment: environmentOf<ServiceEnvironment>(command),
    flags: command.optsWithGlobals<GlobalFlags>(),
    profile: base.settings.profile,
    tokens: tokenStore(base.env, base.keyring, base.renderer.warn),
  }
}

export const signInWords = (profile: string) => `\`${IDENTITY.command} ${profile} session start\``

export const refuseOffline = (flags: GlobalFlags) => {
  if (flags.offline)
    throw new CliError("permission_error", `this needs ${SERVICE}; leave out --offline`, { reason: "offline.refused" })
}

/** With no base URL the CLI talks to the built-in fake, so the example works with no service behind it. */
const fetchFor = (env: NodeJS.ProcessEnv, injected: typeof fetch | undefined) =>
  injected ?? (env[BASE_URL_VARIABLE] ? fetch : fakeAcme().fetch)

/** The service for one run, with the token it was given; `events` comes from `run()`, so each request is recorded. */
export const serviceFor = (command: Command, token: string, events?: EventSink): AcmeApi => {
  const { environment, env, profile } = contextOf(command)
  const baseUrl = env[BASE_URL_VARIABLE]
  return acmeApi(
    transport({
      token,
      ...(baseUrl ? { baseUrl } : {}),
      fetch: fetchFor(env, environment.fetch),
      signal: environment.signal,
      ...(events ? { events } : {}),
      pacer: new Pacer(pacePathFor(IDENTITY, profile, env), PACE),
    }),
  )
}

/** The profile's saved token, or an authentication error that says how to sign in. Read before any request. */
export const tokenOf = (command: Command): string => {
  const { flags, profile, tokens } = contextOf(command)
  refuseOffline(flags)
  const saved = tokens.read(profile)
  if (!saved)
    throw new CliError("authentication_error", `profile ${profile} is not signed in — run ${signInWords(profile)}`, {
      reason: "auth.failed",
    })
  return saved.secret
}

/**
 * Every remote call outside the CRM commands goes through here: inside cli-core's run, so `--timeout` bounds it, a
 * failure or `--record` keeps a run named after the command, and the requests land in that run.
 */
export const withService = <T>(command: Command, body: (service: AcmeApi) => Promise<T>): Promise<T> => {
  const token = tokenOf(command)
  return contextOf(command).run((events) => body(serviceFor(command, token, events)))
}

/** The workspace `session start` saw, so a store read needs no request (cli-core does not export its reader). */
export const recalledWorkspace = (command: Command): string | undefined => {
  const { env, profile } = contextOf(command)
  try {
    const { account } = JSON.parse(readFileSync(accountFileFor(IDENTITY, profile, env), "utf8")) as {
      account?: unknown
    }
    return typeof account === "string" ? account : undefined
  } catch {
    return undefined
  }
}

export const workspaceOf = (command: Command): string => {
  const workspace = recalledWorkspace(command)
  if (workspace) return workspace
  const { profile } = contextOf(command)
  throw new CliError("authentication_error", `profile ${profile} is not signed in — run ${signInWords(profile)}`, {
    reason: "auth.failed",
  })
}
