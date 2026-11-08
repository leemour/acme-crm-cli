# Changelog

Notable changes to `@leemour/acme-crm-cli`. One section per version, newest first.

## 0.3.0 — 08.11.2026

### Added

- `deals list --format csv` prints the page as a table for a spreadsheet, from cli-core.
- The manifest says which hosts the example talks to: none on its own, since it answers from a built-in fake, and the
  Acme CRM server you set in `ACME_CRM_BASE_URL`.

### Security

- With `ACME_CRM_BASE_URL` set, requests go through cli-base's `hostFetch` and reach only that server's host: a
  redirect elsewhere is refused before a byte is sent. An address that does not parse is a `configuration_error`.

### Fixed

- A hidden prompt, such as the token prompt of `session start`, asks again when nothing arrived. From cli-core
  0.615.0 (was 0.605.0) and cli-base 0.87.0 (was 0.82.0).

## 0.2.0 — 08.11.2026

### Fixed

- The release publishes the MCP server to the MCP Registry as `io.github.leemour/acme-crm-cli`, with a GitHub OIDC
  sign-in; `package.json` names it in `mcpName`, which the registry checks. Before, it skipped the registry for want
  of WireCat's key.
- The release no longer tries to publish the skill to ClawHub, whose `wirecat` owner is WireCat's.
- Moved to `@wirecat/cli-template` 0.20.0, which brings both.

## 0.1.0 — 08.11.2026

### Added

- Started from `@wirecat/cli-template` 0.18.0.
- `sync` copies Acme CRM organizations, people and deals into the WireCat store and imports invoices as proposals.
- `contacts list` and `contacts show`, and cli-core's `deals`, `pipelines`, `stages`, `fields`, `store status` and `search all`.
- A built-in fake of Acme CRM with synthetic data, used whenever `ACME_CRM_BASE_URL` is unset.
