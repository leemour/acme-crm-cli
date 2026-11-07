import { annotate } from "@wirecat/cli-base/commands"
import {
  answerEntity,
  commandPath,
  FETCH,
  itemOf,
  outputFor,
  pagedList,
  pageOf,
  REMOTE_READ,
  renderAnswer,
  runBudgetOf,
  withPaging,
} from "@wirecat/cli-core/cli"
import { type CrmSyncReport, syncCrm } from "@wirecat/cli-core/crm"
import { addCrmCommands, type CrmRun } from "@wirecat/cli-core/crm/cli"
import { type IngestReceipt, ingest } from "@wirecat/cli-core/services"
import type { AccountKey, MessageStore } from "@wirecat/cli-core/store"
import { Command } from "commander"
import * as v from "valibot"
import type { AcmeApi, Invoice, Person } from "../acme/api.js"
import { acmeCrmSource, PROVIDER } from "../acme/crm-source.js"
import { invoicesEnvelope } from "../acme/invoices.js"
import { SERVICE } from "../acme/transport.js"
import { contextOf, recalledWorkspace, serviceFor, tokenOf, withService, workspaceOf } from "../context.js"
import { IDENTITY } from "../identity.js"

const CLI = IDENTITY.command

/**
 * The profile's account in the shared store. A read finds it from an earlier sync and never opens the store for
 * writing; a first read, a missing store and every sync open it for writing and save the account and profile.
 */
const storeFor = async (
  command: Command,
  readOnly: boolean,
  workspace: string,
): Promise<{ store: MessageStore; account: AccountKey }> => {
  const { env, profile } = contextOf(command)
  const account: AccountKey = { provider: PROVIDER, account: workspace }
  const { openAcmeStore } = await import("../store.js")
  if (readOnly) {
    const store = await openAcmeStore(env, { readOnly: true }).catch(() => undefined)
    if (store) {
      const saved = await store.accounts
        .profiles()
        .then((all) => all[CLI]?.[profile])
        .catch(() => undefined)
      if (saved?.account === account.account) return { store, account }
      await store.close()
    }
  }
  const store = await openAcmeStore(env)
  try {
    await store.accounts.saveAccount(account, { name: null })
    await store.accounts.saveProfile(CLI, profile, account)
    return { store, account }
  } catch (error) {
    await store.close()
    throw error
  }
}

const openProfile = async (command: Command, { readOnly }: { readOnly: boolean }): Promise<CrmRun> => {
  const { env, profile } = contextOf(command)
  const { store, account } = await storeFor(command, readOnly, workspaceOf(command))
  let api: AcmeApi | undefined
  const source = acmeCrmSource(() => (api ??= serviceFor(command, tokenOf(command))))
  return { profile, account, store, env, source: () => source, close: () => store.close() }
}

const allInvoices = async (api: AcmeApi): Promise<Invoice[]> => {
  const invoices: Invoice[] = []
  let page: string | undefined
  do {
    const found = await api.list("invoices", { page })
    for (const invoice of found.items) invoices.push(invoice)
    page = found.next ?? undefined
  } while (page)
  return invoices
}

const syncSchema = v.strictObject({
  provider: v.string(),
  account: v.string(),
  state: v.picklist(["partial", "complete"]),
  organizations: v.number(),
  people: v.number(),
  deals: v.number(),
  invoices: v.strictObject({
    created: v.number(),
    updated: v.number(),
    unchanged: v.number(),
    refused: v.number(),
    proposed: v.array(v.string()),
    waiting: v.number(),
  }),
  issues: v.array(v.strictObject({ kind: v.string(), reason: v.string(), message: v.string() })),
})

const savedOf = (report: CrmSyncReport, kind: string) => report.synced.find((one) => one.kind === kind)?.saved ?? 0

const syncAnswer = (report: CrmSyncReport, receipt: IngestReceipt): v.InferOutput<typeof syncSchema> => ({
  provider: report.provider,
  account: report.account,
  state: report.state === "complete" && receipt.errors.length === 0 ? "complete" : "partial",
  organizations: savedOf(report, "organization"),
  people: savedOf(report, "person"),
  deals: savedOf(report, "deal"),
  invoices: {
    created: receipt.created,
    updated: receipt.updated,
    unchanged: receipt.unchanged,
    refused: receipt.refused,
    proposed: receipt.proposed,
    waiting: receipt.waiting.length,
  },
  issues: [
    ...report.synced.flatMap((one) =>
      one.error ? [{ kind: one.kind, reason: "sync.partial", message: one.error }] : [],
    ),
    ...report.issues.map(({ kind, reason, message }) => ({ kind, reason, message })),
    ...receipt.errors.map((error) => ({ kind: "invoice", reason: error.code, message: error.message })),
  ],
})

/**
 * One command for everything Acme holds: the CRM port keeps contacts, companies and deals; invoices go through the
 * records envelope after it, so their counterparty organizations already exist. A second run imports nothing new.
 */
const syncCommand = () =>
  answerEntity(
    annotate(new Command("sync"), {
      effects: FETCH,
      offline: false,
      examples: [`${CLI} personal sync`, `${CLI} personal sync --json`],
    }),
    "acme_sync",
    syncSchema,
  )
    .description(
      `bring the local copy of ${SERVICE} up to date: organizations, people and deals through the CRM sync, then ` +
        "invoices as proposals the owner confirms; a second run fetches only what changed",
    )
    .action(async function (this: Command) {
      const token = tokenOf(this)
      const answer = await contextOf(this).run(async (events) => {
        const api = serviceFor(this, token, events)
        // A token from ACME_CRM_TOKEN has had no session start to name its workspace.
        const workspace = recalledWorkspace(this) ?? (await api.me()).workspace.id
        const { store, account } = await storeFor(this, false, workspace)
        try {
          const report = await syncCrm(
            acmeCrmSource(() => api),
            store,
            account,
            { budget: runBudgetOf(this) },
          )
          const envelope = invoicesEnvelope(account.account, `sync-${Date.now()}`, await allInvoices(api))
          return syncAnswer(report, await ingest(store, envelope, { account: account.account }))
        } finally {
          await store.close()
        }
      })
      renderAnswer(
        this,
        outputFor(this),
        itemOf(answer, answer.state === "partial" ? { meta: { complete: false } } : {}),
      )
    })

const contactSchema = v.strictObject({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  phone: v.string(),
  organization: v.nullable(v.strictObject({ id: v.string(), name: v.string(), website: v.string() })),
  updated_at: v.string(),
})

const contactOf = (
  person: Person,
  organization: v.InferOutput<typeof contactSchema>["organization"],
): v.InferOutput<typeof contactSchema> => ({
  id: person.id,
  name: person.name,
  email: person.email,
  phone: person.phone,
  organization,
  updated_at: person.updated_at,
})

const contactsList = () =>
  withPaging(
    answerEntity(
      annotate(new Command("list"), {
        effects: REMOTE_READ,
        offline: false,
        examples: [`${CLI} personal contacts list`, `${CLI} personal contacts list --json=id,name,email`],
      }),
      "acme_contact",
      contactSchema,
    ),
  )
    .description(`list the people in ${SERVICE}, a page at a time`)
    .action(async function (this: Command) {
      const path = commandPath(this)
      const { settings } = contextOf(this)
      const { limit, offset } = pageOf(settings)
      const found = await withService(this, (api) =>
        api.list("people", { limit: Math.min(limit, 100), page: String(offset) }),
      )
      const items = found.items.map((person) => contactOf(person, null))
      renderAnswer(this, outputFor(this), pagedList(path, settings, { items, has_more: found.next !== null }))
    })

const contactsShow = () =>
  answerEntity(
    annotate(new Command("show"), {
      effects: REMOTE_READ,
      offline: false,
      examples: [`${CLI} personal contacts show per_01`, `${CLI} personal contacts show per_01 --json`],
    }),
    "acme_contact",
    contactSchema,
  )
    .description(`show one person in ${SERVICE} with the organization they work for`)
    .argument("<id>", "the person's id, as contacts list prints it")
    .action(async function (this: Command, id: string) {
      const contact = await withService(this, async (api) => {
        const person = await api.person(id)
        const { id: orgId, name, website } = await api.organization(person.organization_id)
        return contactOf(person, { id: orgId, name, website })
      })
      renderAnswer(this, outputFor(this), itemOf(contact))
    })

const contactsCommand = () =>
  annotate(new Command("contacts"), { effects: REMOTE_READ })
    .description(`read the people in ${SERVICE}`)
    .addCommand(contactsList())
    .addCommand(contactsShow())

/**
 * cli-core's CRM commands over the store (`deals`, `pipelines`, `stages`, `store status`, `search`), without its
 * `sync`: Acme's own `sync` also imports invoices, which the CRM port does not carry.
 */
export const acmeCommands = (): Command[] => {
  const holder = new Command(CLI)
  addCrmCommands(holder, { app: IDENTITY, open: openProfile, leads: false })
  return [syncCommand(), contactsCommand(), ...holder.commands.filter((command) => command.name() !== "sync")]
}
