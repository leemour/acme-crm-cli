# acme-crm — design

Written by `npx @wirecat/cli-template new`. The agent reads it first, asks the further questions the reference CLI
does not answer, and starts building only after the owner has read it.

## Answers

- **Category:** CRM (sales: deals, contacts, companies)
- **Content languages:** en
- **Sign-in:** an API token or key
- **The API:** official API documentation only
- **How people filter:** by time, by status or label
- **Never in the store, a log or the output:** tokens and passwords
- **Untrusted input:** deals, contacts and comments others entered, names and titles set by others

## Reference CLI

Learn from [bitrix24-cli](https://github.com/WireCatLabs/bitrix24-cli).

## Content languages

Languages: en.

## Further answers

- **The service:** Acme CRM is made up. `src/acme/fake.ts` is its whole contract, a strict fake that refuses any
  other path, parameter or token. With `ACME_CRM_BASE_URL` unset the CLI talks to it in process; set, it talks HTTP to
  that address. Synthetic data only (`src/acme/data.ts`).
- **Store:** no SQL and no tables of its own. Organizations, people and deals go through cli-core's CRM port
  (`syncCrm`); invoices go through the records envelope (`ingest`) after it, with a `counterparty` relation to the
  organization record the CRM sync saved under the same account, so they become `invoice:` proposals with no name
  matching.
- **Commands:** the root `sync` does both. cli-core's CRM commands are mounted without their `sync`: `deals`,
  `pipelines`, `stages`, `store status`, `search`. `contacts list|show` read the service live.
- **Account:** `session start` remembers the workspace id from `GET /me`; store reads use it and make no request.

## Open questions for the owner
