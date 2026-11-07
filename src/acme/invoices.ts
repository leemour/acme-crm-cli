import type { RecordsEnvelope } from "@wirecat/cli-core"
import type { Invoice } from "./api.js"
import { PROVIDER } from "./crm-source.js"

/**
 * Invoices as a v1 records envelope. The counterparty is a relation to the organization record the CRM sync already
 * saved under the same account, so ingest finds it without matching any name; the import becomes `invoice:`
 * proposals the owner confirms.
 */
export const invoicesEnvelope = (account: string, batchId: string, invoices: Invoice[]): RecordsEnvelope => ({
  schema_version: 1,
  source: { provider: PROVIDER, account, batch_id: batchId },
  records: invoices.map((invoice) => ({
    key: invoice.id,
    type: "invoice",
    external_id: invoice.id,
    operation: "upsert",
    revision: invoice.revision,
    fields: {
      direction: "receivable",
      number: invoice.number,
      currency: invoice.currency,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      total: invoice.total,
      lines: invoice.lines.map((line) => ({
        description: line.description,
        quantity: String(line.quantity),
        unit_price: line.unit_price,
        amount: line.amount,
      })),
    },
    relations: [{ role: "counterparty", type: "organization", external_id: invoice.organization_id }],
  })),
})
