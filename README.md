# acme-crm

`@leemour/acme-crm-cli` is an **example** of a WireCat-compatible CLI built outside WireCatLabs. It talks to Acme CRM,
a service that does not exist: with `ACME_CRM_BASE_URL` unset, the CLI answers from a built-in fake that holds
synthetic data only (10 organizations, 25 people, 15 deals, 8 invoices). Every name is made up and every address is
on `example.com`. Use it to see how a third-party tool plugs into WireCat, not to manage a real CRM.

It shows the pieces a real tool needs:

- sign-in with `session start`, the token kept in the OS keyring;
- `sync`, which copies organizations, people and deals through cli-core's CRM port and imports invoices through the
  records envelope, as `invoice:` proposals the owner confirms in WireCat;
- read commands with declared effects and JSON output: `deals list`, `deals show`, `contacts list`, `contacts show`;
- `contracts/wirecat.json`, the manifest WireCat Desktop reads, and an MCP server and agent skill.

## Install

In WireCat Desktop, add the community tool `@leemour/acme-crm-cli`. Or from a terminal:

```sh
npm install -g @leemour/acme-crm-cli
```

Sign a profile in. The fake takes any token that starts with `acme_test_`, such as `acme_test_demo`:

```sh
acme-crm personal session start
acme-crm personal sync
acme-crm personal deals list status:open
```

Every command that uses an account names its profile (`personal` above). The tool never picks one for you.

## Agent usage

```sh
acme-crm skill install --for claude
acme-crm personal mcp config --json
```

An agent then runs, for example:

```sh
acme-crm personal sync --json
acme-crm personal deals list status:won --json=ref,title,amount,currency
acme-crm personal contacts show per_01 --json
```

## Development

```sh
pnpm install
pnpm test
pnpm generate
```

The design is in [docs/dev/DESIGN.md](docs/dev/DESIGN.md). `bin/first-publish` publishes the first version by hand;
later versions go out through `.github/workflows/release.yml` with npm trusted publishing.
