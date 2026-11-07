import * as v from "valibot"
import type { Transport } from "./transport.js"

// Acme CRM's wire shapes. The service is made up; its contract is the fake in ./fake.ts, which refuses any other
// field or parameter. No wire type leaves this file (WC-ARCH-3).

const outcome = v.picklist(["open", "won", "lost"])

const wireOrganization = v.object({ id: v.string(), name: v.string(), website: v.string(), updated_at: v.string() })
const wirePerson = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  phone: v.string(),
  organization_id: v.string(),
  updated_at: v.string(),
})
const wireDeal = v.object({
  id: v.string(),
  title: v.string(),
  pipeline_id: v.string(),
  stage_id: v.string(),
  status: outcome,
  amount: v.string(),
  currency: v.string(),
  organization_id: v.string(),
  person_ids: v.array(v.string()),
  expected_close: v.string(),
  created_at: v.string(),
  updated_at: v.string(),
})
const wireInvoice = v.object({
  id: v.string(),
  number: v.string(),
  organization_id: v.string(),
  currency: v.string(),
  issue_date: v.string(),
  due_date: v.string(),
  lines: v.array(
    v.object({ description: v.string(), quantity: v.number(), unit_price: v.string(), amount: v.string() }),
  ),
  total: v.string(),
  revision: v.number(),
  updated_at: v.string(),
})
const wirePipelines = v.object({
  pipelines: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      stages: v.array(v.object({ id: v.string(), name: v.string(), position: v.number(), outcome })),
    }),
  ),
})
const wireMe = v.object({
  user: v.object({ id: v.string(), name: v.string() }),
  workspace: v.object({ id: v.string(), name: v.string() }),
})
const pageOf = <T extends v.GenericSchema>(item: T) =>
  v.object({
    data: v.array(item),
    next_page_token: v.nullable(v.string()),
    deleted_ids: v.array(v.string()),
    sync_token: v.nullable(v.string()),
  })

export type Organization = v.InferOutput<typeof wireOrganization>
export type Person = v.InferOutput<typeof wirePerson>
export type Deal = v.InferOutput<typeof wireDeal>
export type Invoice = v.InferOutput<typeof wireInvoice>

const LISTS = {
  organizations: wireOrganization,
  people: wirePerson,
  deals: wireDeal,
  invoices: wireInvoice,
} as const
export type ListName = keyof typeof LISTS
type ItemOf<K extends ListName> = v.InferOutput<(typeof LISTS)[K]>

export interface Page<T> {
  items: T[]
  removed: string[]
  next: string | null
  cursor: string | null
}

export const PAGE_SIZE = 100

/** Every call the CLI makes to Acme CRM; all of them read. */
export const acmeApi = (api: Transport) => ({
  me: () => api.get({ path: "me" }, wireMe),
  pipelines: async () => (await api.get({ path: "pipelines" }, wirePipelines)).pipelines,
  list: async <K extends ListName>(
    name: K,
    {
      since,
      page,
      limit = PAGE_SIZE,
    }: { since?: string | null | undefined; page?: string | undefined; limit?: number },
  ): Promise<Page<ItemOf<K>>> => {
    const answer = await api.get(
      { path: name, query: { limit, page_token: page, updated_since: since ?? undefined } },
      pageOf(LISTS[name]),
    )
    return {
      items: answer.data as ItemOf<K>[],
      removed: answer.deleted_ids,
      next: answer.next_page_token,
      cursor: answer.sync_token,
    }
  },
  person: (id: string) => api.get({ path: "people/{id}", ids: { id } }, wirePerson),
  organization: (id: string) => api.get({ path: "organizations/{id}", ids: { id } }, wireOrganization),
})

export type AcmeApi = ReturnType<typeof acmeApi>
