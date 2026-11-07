// Synthetic only: every name is made up, every address is on example.com, every phone is a 555 number.

export interface WireOrganization {
  id: string
  name: string
  website: string
  updated_at: string
}

export interface WirePerson {
  id: string
  name: string
  email: string
  phone: string
  organization_id: string
  updated_at: string
}

export interface WireStage {
  id: string
  name: string
  position: number
  outcome: "open" | "won" | "lost"
}

export interface WirePipeline {
  id: string
  name: string
  stages: WireStage[]
}

export interface WireDeal {
  id: string
  title: string
  pipeline_id: string
  stage_id: string
  status: "open" | "won" | "lost"
  amount: string
  currency: string
  organization_id: string
  person_ids: string[]
  expected_close: string
  created_at: string
  updated_at: string
}

export interface WireLine {
  description: string
  quantity: number
  unit_price: string
  amount: string
}

export interface WireInvoice {
  id: string
  number: string
  organization_id: string
  currency: string
  issue_date: string
  due_date: string
  lines: WireLine[]
  total: string
  revision: number
  updated_at: string
}

export interface Dataset {
  workspace: { id: string; name: string }
  user: { id: string; name: string }
  pipelines: WirePipeline[]
  organizations: WireOrganization[]
  people: WirePerson[]
  deals: WireDeal[]
  invoices: WireInvoice[]
}

const two = (n: number) => String(n).padStart(2, "0")
const day = (n: number) => `2026-10-${two(n)}T09:00:00Z`

const ORGANIZATIONS = [
  "Northwind Test Ltd",
  "Bluebird Sample GmbH",
  "Copperleaf Demo SL",
  "Driftwood Fixture Inc",
  "Evergreen Mock BV",
  "Foxglove Example Oy",
  "Granite Placeholder AB",
  "Harbor Synthetic SA",
  "Ironbark Pretend Pty",
  "Juniper Dummy Srl",
]

const FIRST = ["Ada", "Ben", "Cleo", "Dev", "Eli"]
const LAST = ["Testova", "Sampleton", "Demoff", "Fixturez", "Mockridge"]

const SALES: WirePipeline = {
  id: "pl_sales",
  name: "Sales",
  stages: [
    { id: "st_new", name: "New", position: 1, outcome: "open" },
    { id: "st_proposal", name: "Proposal sent", position: 2, outcome: "open" },
    { id: "st_won", name: "Won", position: 3, outcome: "won" },
    { id: "st_lost", name: "Lost", position: 4, outcome: "lost" },
  ],
}

const STAGE_OF_DEAL = ["st_new", "st_proposal", "st_proposal", "st_won", "st_lost"] as const

const cents = (value: number) => (value / 100).toFixed(2)

const lineOf = (description: string, quantity: number, unitCents: number): WireLine => ({
  description,
  quantity,
  unit_price: cents(unitCents),
  amount: cents(quantity * unitCents),
})

const invoiceOf = (n: number): WireInvoice => {
  const lines = [lineOf("Widget licence, test seat", n + 1, 4_500), lineOf("Onboarding session, sample", 1, 25_000)]
  const total = lines.reduce((sum, line) => sum + Math.round(Number(line.amount) * 100), 0)
  return {
    id: `inv_${two(n)}`,
    number: `ACME-TEST-${String(n).padStart(4, "0")}`,
    organization_id: `org_${two(((n - 1) % 10) + 1)}`,
    currency: n % 2 ? "EUR" : "USD",
    issue_date: `2026-10-${two(n)}`,
    due_date: `2026-11-${two(n)}`,
    lines,
    total: cents(total),
    revision: 1,
    updated_at: day(n + 10),
  }
}

/** A fresh copy each call, so one fake never sees another's changes. */
export const dataset = (): Dataset => ({
  workspace: { id: "acme-demo", name: "Acme Demo Workspace" },
  user: { id: "usr_01", name: "Demo Owner" },
  pipelines: [structuredClone(SALES)],
  organizations: ORGANIZATIONS.map((name, i) => ({
    id: `org_${two(i + 1)}`,
    name,
    website: `https://org${two(i + 1)}.example.com`,
    updated_at: day(i + 1),
  })),
  people: Array.from({ length: 25 }, (_, i) => {
    const first = FIRST[i % 5] ?? "Ada"
    const last = LAST[Math.floor(i / 5)] ?? "Testova"
    return {
      id: `per_${two(i + 1)}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      phone: `+1-555-01${two(i + 1)}`,
      organization_id: `org_${two((i % 10) + 1)}`,
      updated_at: day((i % 28) + 1),
    }
  }),
  deals: Array.from({ length: 15 }, (_, i) => {
    const stage = STAGE_OF_DEAL[i % 5] ?? "st_new"
    const status = stage === "st_won" ? "won" : stage === "st_lost" ? "lost" : "open"
    return {
      id: `deal_${two(i + 1)}`,
      title: `Test deal ${two(i + 1)}: ${ORGANIZATIONS[i % 10]}`,
      pipeline_id: SALES.id,
      stage_id: stage,
      status,
      amount: cents((i + 1) * 150_000),
      currency: "EUR",
      organization_id: `org_${two((i % 10) + 1)}`,
      person_ids: [`per_${two((i % 25) + 1)}`],
      expected_close: `2026-12-${two((i % 28) + 1)}`,
      created_at: day(i + 1),
      updated_at: day(i + 2),
    }
  }),
  invoices: Array.from({ length: 8 }, (_, i) => invoiceOf(i + 1)),
})
