import { Readable } from "node:stream"
import { type KeyringStore, memoryKeyring } from "@wirecat/cli-base"
import type { RunOptions } from "@wirecat/cli-core/cli"
import { FAKE_TOKEN, fakeAcme } from "../acme/fake.js"
import type { ServiceEnvironment } from "../context.js"
import { IDENTITY } from "../identity.js"
import { run } from "../program.js"

/** A keyring where profile `personal` is already signed in to the fake service; never the real one (WC-TEST-2). */
export const signedIn = (): KeyringStore => memoryKeyring({ [`${IDENTITY.appName}:token:personal`]: FAKE_TOKEN })

export interface Ran {
  code: number
  out: string
  err: string
  /** stdout parsed, or the error object from stderr. */
  json: () => Record<string, unknown>
}

/** The CLI through its own `run()`, as a person or an agent types it, against the fake service (WC-TEST-6). */
export const runCli = async (
  argv: string[],
  {
    service = fakeAcme(),
    keyring = signedIn(),
    stdin,
    env,
    answer,
  }: {
    service?: ReturnType<typeof fakeAcme>
    keyring?: KeyringStore
    stdin?: string
    env?: NodeJS.ProcessEnv
    /** The owner's answer to a question; cli-core never asks under --json, so a test of `ask` leaves it out. */
    answer?: (question: string) => string | null
  } = {},
): Promise<Ran> => {
  const out: string[] = []
  const err: string[] = []
  const options: RunOptions & ServiceEnvironment = {
    streams: { data: (text) => out.push(text), diagnostic: (text) => err.push(text) },
    tty: false,
    keyring,
    fetch: service.fetch,
    ...(env ? { env: { ...process.env, ...env } } : {}),
    ...(answer ? { answer } : {}),
    ...(stdin === undefined ? {} : { stdin: Object.assign(Readable.from([stdin]), { isTTY: false }) }),
  }
  const code = await run(argv, options)
  const text = { out: out.join(""), err: err.join("") }
  return { code, ...text, json: () => JSON.parse(text.out.trim() || text.err.trim()) as Record<string, unknown> }
}
