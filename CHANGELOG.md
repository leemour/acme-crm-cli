# Changelog

Notable changes to `@leemour/acme-crm-cli`. One section per version, newest first.

## 0.1.0 — 08.11.2026

### Added

- Started from `@wirecat/cli-template` 0.18.0.
- `sync` copies Acme CRM organizations, people and deals into the WireCat store and imports invoices as proposals.
- `contacts list` and `contacts show`, and cli-core's `deals`, `pipelines`, `stages`, `fields`, `store status` and `search all`.
- A built-in fake of Acme CRM with synthetic data, used whenever `ACME_CRM_BASE_URL` is unset.
