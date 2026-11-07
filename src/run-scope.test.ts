import { Readable } from "node:stream"
import { neverAnswers, runScopeCases } from "@wirecat/cli-core/testing"
import { describe, it } from "vitest"
import { FAKE_TOKEN, fakeAcme } from "./acme/fake.js"
import { definition } from "./program.js"
import { signedIn } from "./testing/harness.js"

const stdin = () => Object.assign(Readable.from([FAKE_TOKEN]), { isTTY: false })

describe("each remote command runs inside cli-core's run", () => {
  const cases = runScopeCases({
    definition: definition(),
    commands: {
      sync: ["personal", "sync"],
      "contacts list": ["personal", "contacts", "list"],
      "contacts show": ["personal", "contacts", "show", "per_01"],
      "session start": ["personal", "session", "start"],
      "session status": ["personal", "session", "status", "--check"],
    },
    skip: {
      "mcp serve": "listens until stopped",
      doctor:
        "cli-core's appDoctorCommand answers --online outside a run of its own; drop this once core runs it inside",
    },
    answering: () => ({ keyring: signedIn(), fetch: fakeAcme().fetch, stdin: stdin() }),
    silent: () => ({ keyring: signedIn(), fetch: neverAnswers, stdin: stdin() }),
  })
  for (const one of cases) it(one.name, () => one.run())
})
