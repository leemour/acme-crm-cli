import { isCliError } from "@wirecat/cli-base"
import type { CrmItem, CrmKind, CrmOrganization, CrmPerson, CrmPipeline, CrmRecords } from "@wirecat/cli-core"
import type { CrmChanges, CrmSource } from "@wirecat/cli-core/crm"
import type { AcmeApi, Deal, ListName, Organization, Person } from "./api.js"

export const PROVIDER = "acme-crm"

const organizationOf = (wire: Organization): CrmOrganization => ({
  externalId: wire.id,
  name: wire.name,
  url: wire.website,
})

const personOf = (wire: Person): CrmPerson => ({
  externalId: wire.id,
  name: wire.name,
  email: wire.email,
  phone: wire.phone,
})

const dealOf = (wire: Deal): CrmItem => ({
  externalId: wire.id,
  title: wire.title,
  pipeline: wire.pipeline_id,
  stage: wire.stage_id,
  status: wire.status,
  amount: wire.amount,
  currency: wire.currency,
  closeDate: wire.expected_close,
  organization: wire.organization_id,
  people: wire.person_ids.map((externalId) => ({ externalId, role: "contact" as const })),
  createdAt: Date.parse(wire.created_at),
  updatedAt: Date.parse(wire.updated_at),
})

const READERS = {
  organization: { list: "organizations", map: organizationOf },
  person: { list: "people", map: personOf },
  deal: { list: "deals", map: dealOf },
} as const satisfies Partial<Record<CrmKind, { list: ListName; map: (wire: never) => unknown }>>

/**
 * Acme CRM has no leads and reports deletions in every page, so the engine never lists ids. Its cursor is the newest
 * `updated_at` it has served; one it cannot read is refused with HTTP 400, which starts a full round.
 */
export const acmeCrmSource = (api: () => AcmeApi): CrmSource => ({
  provider: PROVIDER,
  traits: { kinds: ["organization", "person", "deal"], removedInChanges: true },
  pipelines: async (kind): Promise<CrmPipeline[]> => {
    if (kind === "lead") return []
    return (await api().pipelines()).map((pipeline) => ({
      externalId: pipeline.id,
      name: pipeline.name,
      stages: pipeline.stages.map((stage) => ({
        externalId: stage.id,
        name: stage.name,
        position: stage.position,
        outcome: stage.outcome,
      })),
    }))
  },
  changes: async <K extends CrmKind>(kind: K, cursor: string | null, page?: string) => {
    if (kind === "lead") return { items: [], cursor: null } as CrmChanges<CrmRecords[K]>
    const reader = READERS[kind as keyof typeof READERS]
    try {
      const found = await api().list(reader.list, { since: cursor, page })
      return {
        items: found.items.map((wire) => reader.map(wire as never)),
        removed: found.removed,
        ...(found.next ? { nextPage: found.next } : { cursor: found.cursor }),
      } as CrmChanges<CrmRecords[K]>
    } catch (error) {
      if (cursor !== null && isCliError(error) && error.details?.status === 400) return { reset: true }
      throw error
    }
  },
})
