<!-- Generated from the command tree by pnpm generate. Do not edit. -->

# Commands

Every command, option and exit code, generated from the program itself. For the same list as JSON, run
`acme-crm commands --json`.

**The first word is the profile**, a name you choose: `acme-crm personal config show`. `ACME_CRM_PROFILE`
does the same for a whole shell session. No profile is assumed: a command that uses an account stops without one and
lists the profiles on this computer.

## Options for every command

| Option | What it does |
|---|---|
| `-V, --version` | output the version number. |
| `-v, --verbose` | more detail in what is shown: -v ids, -vv everything we know. Default: `0`. |
| `--json` | machine-readable output: one JSON value on stdout; --json=id,text keeps only those fields. |
| `--jsonl` | machine-readable output: one JSON object per line, for streaming and jq. |
| `--quiet` | diagnostics off; a failure is still said. |
| `--trace` | the connection's own log lines on stderr — never content. |
| `--debug` | on a failure, its whole record — cause and stack — in place of the short line. |
| `--timeout <duration>` | give up on the whole command after this — 30s, 2m, 500ms. |
| `--offline` | answer from what was recorded and never connect; fails if nothing was. |
| `--no-input` | never prompt or open interactive login; piped input remains available. |
| `--max-input-bytes <bytes>` | maximum buffered input bytes (default: 16777216). |
| `--max-output-bytes <bytes>` | maximum machine output bytes (default: 4194304; 0 disables). |
| `--brief` | found items as reference, title, time, author and excerpt only. |
| `--full` | found items with their whole text and every provider field. |
| `--compact` | one line per item for an agent: reference first, text last, paging and next steps as # lines. |
| `--dry-run` | preview parsed arguments and permissions before running the action. |
| `--yes` | go ahead without the question an ask level puts before a write. |
| `--record` | keep this run even where the config says record false; record_input false leaves the typed words out. |
| `--no-record` | do not keep this run, even if it fails. |

## `acme-crm commands`

every command by section; --json prints its contract, one path per call

### `acme-crm commands info`

one command contract, or all schemas, error reasons and explicit overrides

```sh
acme-crm commands info [path]
```

| Argument | | What it is |
|---|---|---|
| `path` | optional | one command path; without one, export schemas, error reasons and explicit overrides. |

**Example:** `acme-crm commands info commands`

## `acme-crm session`

keep this profile's Acme CRM token in the OS keyring

### `acme-crm session start`

sign this profile in: the Acme CRM API token is asked hidden or read from stdin, never taken as an argument, checked against the service, and only then kept in the keyring, or in a private file

**Changes something on this computer only.**

```sh
acme-crm session start [options]
```

| Option | What it does |
|---|---|
| `--credential-storage <storage>` | where the token is kept: keyring, which falls back to a private file by itself, or file. Default: `keyring`. |

**Example:** `acme-crm personal session start`, `acme-crm personal session start --credential-storage file`

### `acme-crm session status`

show where this profile's token comes from: ACME_CRM_TOKEN, the keyring or a file, never the token; --check asks Acme CRM whose token it is

```sh
acme-crm session status [options]
```

| Option | What it does |
|---|---|
| `--check` | ask Acme CRM whether the token still works, and whose it is. |

**Example:** `acme-crm personal session status`, `acme-crm personal session status --check --json`

### `acme-crm session end`

forget this profile's token on this computer; the token itself stays valid in Acme CRM

**Changes something on this computer only.**

```sh
acme-crm session end
```

**Example:** `acme-crm personal session end`

### `acme-crm session list`

list the profiles on this computer and whether each has a token; picks none

```sh
acme-crm session list
```

**Example:** `acme-crm session list`, `acme-crm session list --json`

## `acme-crm sync`

bring the local copy of Acme CRM up to date: organizations, people and deals through the CRM sync, then invoices as proposals the owner confirms; a second run fetches only what changed

**Changes something on this computer only.**

```sh
acme-crm sync
```

**Returns:** acme sync — provider, account, state, organizations, people, deals, invoices, issues; every field: acme-crm commands info sync

**Example:** `acme-crm personal sync`, `acme-crm personal sync --json`

## `acme-crm contacts`

read the people in Acme CRM

### `acme-crm contacts list`

list the people in Acme CRM, a page at a time

```sh
acme-crm contacts list [query] [options]
```

| Argument | | What it is |
|---|---|---|
| `query` | optional | field:value terms that narrow the list — the fields are below. |

| Option | What it does |
|---|---|
| `--limit <n>` | how many to show. |
| `--page <n>` | which page, starting at 1. |
| `--all` | every row, no paging. |

**Returns:** acme contact — id, name, email, phone, organization, updated_at; every field: acme-crm commands info contacts list

**Example:** `acme-crm personal contacts list`, `acme-crm personal contacts list organization:org_01 --json=id,name`

### `acme-crm contacts show`

show one person in Acme CRM with the organization they work for

```sh
acme-crm contacts show <id>
```

| Argument | | What it is |
|---|---|---|
| `id` | required | the person's id, as contacts list prints it. |

**Returns:** acme contact — id, name, email, phone, organization, updated_at; every field: acme-crm commands info contacts show

**Example:** `acme-crm personal contacts show per_01`, `acme-crm personal contacts show per_01 --json`

## `acme-crm store`

the local copy of the CRM, and the shared store file it lives in

### `acme-crm store status`

how far each kind's sync is: rows saved, partial or complete, when it last moved, how many are stored

```sh
acme-crm store status
```

**Returns:** crm sync progress — kind, round, id_pass, stored, job, profile, done, total, and 6 more; every field: acme-crm commands info store status

**Example:** `acme-crm work store status --json`

### `acme-crm store apply`

apply scope mine to the contacts already stored: remove those no deal or lead of the chosen users and no kept company names, and the people they leave empty; counts only unless --yes, under scope all too. A sync that narrows the scope, or sync --rescan under mine, does this itself

**Changes something on this computer only.**

```sh
acme-crm store apply [options]
```

| Option | What it does |
|---|---|
| `--yes` | remove the contacts it counts; otherwise only count them. |

**Returns:** crm contacts removed — contacts, persons, persons_kept, names, applied; every field: acme-crm commands info store apply

**Example:** `acme-crm work store apply`, `acme-crm work store apply --yes`

### `acme-crm store info`

the store file: where it is, its size, its schema against the one this tool speaks, which tools used it and how many rows it holds, by provider, chat kind, account, year (UTC) and attachment kind, over every account; changes nothing

```sh
acme-crm store info
```

**Returns:** store info — path, exists, schema, opens, error, bytes, journal_mode, pages, and 12 more; every field: acme-crm commands info store info

**Example:** `acme-crm work store info`

### `acme-crm store check`

whether the store is healthy — integrity, search indexes, disk

```sh
acme-crm store check
```

**Returns:** store check — path, exists, ok, opens, error, checks, schema, integrity, and 11 more; every field: acme-crm commands info store check

**Example:** `acme-crm work store check`

### `acme-crm store migrate`

bring the store up to this build's schema, then normalize, index and stem the messages and notes stored before it

**Changes something on this computer only.**

```sh
acme-crm store migrate
```

**Returns:** store migration — path, exists, from, to, normalized, indexed, terms, stemmed, and 1 more; every field: acme-crm commands info store migrate

**Example:** `acme-crm work store migrate`

### `acme-crm store rebuild`

rebuild the word index, its typo vocabulary, the stems, the files' word index, the notes' indexes and who took part in what, from what is stored, and drop the vectors no stored text uses; loses nothing

**Changes something on this computer only.**

```sh
acme-crm store rebuild
```

**Returns:** store reindex — path, exists, normalized, indexed, terms, stemmed, notes_indexed, file_texts, and 2 more; every field: acme-crm commands info store rebuild

**Example:** `acme-crm work store rebuild`

### `acme-crm store backup`

copy the store into a new file, while it is in use; never overwrites a file

**Changes something on this computer only.**

```sh
acme-crm store backup <file> [options]
```

| Argument | | What it is |
|---|---|---|
| `file` | required | the new file. |

| Option | What it does |
|---|---|
| `--encrypt` | compress and encrypt with a password, typed at a hidden prompt or piped on stdin; it is never kept — lose it and the file cannot be opened. |

**Returns:** store backup — path, from, bytes, schema, rows, encrypted; every field: acme-crm commands info store backup

**Example:** `acme-crm work store backup ./backup.db`

### `acme-crm store restore`

put a backup in place of the store; the store it replaces is kept beside it, never deleted. Given a rollback copy (backups/<store>-rollback-schema-<version>-<time>.db, kept for a day before an upgrade older tools cannot open), put its tables back in the store and return it to that version instead

**Changes something on this computer only.**

```sh
acme-crm store restore <file>
```

| Argument | | What it is |
|---|---|---|
| `file` | required | a file `store backup` wrote, or a rollback copy; one written with --encrypt asks for its password. |

**Returns:** store restore — path, restored_from, kept_at, schema, rolled_back, was, tables, rebuilt, and 1 more; every field: acme-crm commands info store restore

**Example:** `acme-crm work store restore ./backup.db`

### `acme-crm store decrypt`

open a file written with --encrypt into a new file; asks for its password

**Changes something on this computer only.**

```sh
acme-crm store decrypt <file> [options]
```

| Argument | | What it is |
|---|---|---|
| `file` | required | a file `store backup --encrypt` or `store export --encrypt` wrote. |

| Option | What it does |
|---|---|
| `--output <file>` | the new file, readable only by you. |

**Returns:** store decrypt — path, from, bytes; every field: acme-crm commands info store decrypt

**Example:** `acme-crm work store decrypt ./backup.enc --output ./restored.db`

### `acme-crm store repair`

bring every table to this build's shape, deleting nothing: a table of the wrong shape is kept as a copy beside a new one

**Changes something on this computer only.**

```sh
acme-crm store repair [options]
```

| Option | What it does |
|---|---|
| `--dry-run` | say what it would do, and change nothing. |

**Returns:** store repair — path, exists, dry_run, repaired, indexes_created, triggers_created, mismatches, foreign_key_violations, and 1 more; every field: acme-crm commands info store repair

**Example:** `acme-crm work store repair --dry-run`

### `acme-crm store reset`

back the store up beside itself, then delete it and start an empty one at this build's schema; asks first, or --yes

**Changes something on this computer only.**

```sh
acme-crm store reset [options]
```

| Option | What it does |
|---|---|
| `--no-backup` | delete the store without backing it up first. |
| `--dry-run` | list every table it would empty, with its rows, and delete nothing. |

**Returns:** store reset — path, exists, reset, dry_run, files, bytes, schema, tables, and 4 more; every field: acme-crm commands info store reset

**Example:** `acme-crm work store reset`

### `acme-crm store copies`

the tables `store repair` kept as copies

#### `acme-crm store copies delete`

delete one copy `store repair` kept, named exactly; refuses any other table

**Changes something on this computer only.**

```sh
acme-crm store copies delete <name>
```

| Argument | | What it is |
|---|---|---|
| `name` | required | the copy's name, as `store repair` printed it. |

**Returns:** store copy removal — path, deleted; every field: acme-crm commands info store copies delete

**Example:** `acme-crm work store copies delete messages_copy_1`

### `acme-crm store tables`

the tables of the local store

#### `acme-crm store tables list`

every table of the local archive: its kind (data, search index, part of a search index, internal) and its rows, a search index's rows not counted; --full adds each table's size on disk, which reads the whole file (about ten seconds for 3 GB); changes nothing

```sh
acme-crm store tables list [query]
```

| Argument | | What it is |
|---|---|---|
| `query` | optional | field:value terms that narrow the list — the fields are below. |

**Returns:** store table — name, kind, rows, bytes; every field: acme-crm commands info store tables list

**Example:** `acme-crm personal store tables list`, `acme-crm personal store tables list kind:data`, `acme-crm personal store tables list --full --json`

### `acme-crm store recover`

check every page and search index of the store, say what is damaged, what it means and the commands that recover it; changes nothing

#### `acme-crm store recover run`

copy every readable row into a new file with the sqlite3 program, rebuild the search indexes, mentions and vector index, check it, and put it in place of the store; the damaged file is kept beside it. Refuses while a WireCat timer or process has the store

**Changes something on this computer only.**

```sh
acme-crm store recover run
```

**Example:** `acme-crm personal store recover run`

## `acme-crm deals`

the CRM's deals as last synced: stage, status, amount and the people on them

### `acme-crm deals list`

deals copied from the CRM, newest first; run sync to bring them up to date

```sh
acme-crm deals list [query] [options]
```

| Argument | | What it is |
|---|---|---|
| `query` | optional | field:value terms that narrow the list — the fields are below. |

| Option | What it does |
|---|---|
| `--limit <n>` | deals per page, 1–500. Default: `50`. |
| `--page <n>` | which page, starting at 1. Default: `1`. |
| `--format <format>` | csv: this page as a table for a spreadsheet; --json=a,b picks its columns. One of: `csv`. |

**Returns:** deal — id, ref, kind, title, summary, pipeline, pipeline_name, stage, and 29 more; every field: acme-crm commands info deals list

**Example:** `acme-crm work deals list status:open --json`, `acme-crm work deals list stage:"Quote sent"`, `acme-crm work deals list status:open --format csv > deals.csv`

### `acme-crm deals show`

one deal with its pipeline, stage, status, amount and the people on it, and the newest recorded meetings and calls of those people in this account's scope; with the activities setting on, its activities and tasks too

```sh
acme-crm deals show <deal>
```

| Argument | | What it is |
|---|---|---|
| `deal` | required | deal:<id>, as a list shows it. |

**Returns:** deal — id, ref, kind, title, summary, pipeline, pipeline_name, stage, and 29 more; every field: acme-crm commands info deals show

**Example:** `acme-crm work deals show deal:12`

## `acme-crm pipelines`

the CRM's pipelines and their stages, as last synced

### `acme-crm pipelines list`

pipelines copied from the CRM, with their stages in order and how many are open in each

```sh
acme-crm pipelines list [query]
```

| Argument | | What it is |
|---|---|---|
| `query` | optional | field:value terms that narrow the list — the fields are below. |

**Returns:** pipeline — id, ref, name, kind, account, external_id, stages, created_at, and 3 more; every field: acme-crm commands info pipelines list

**Example:** `acme-crm work pipelines list --json`, `acme-crm work pipelines list kind:lead`

### `acme-crm pipelines show`

one pipeline as a board and a funnel: how many stand in each stage and their sum per currency, never converted, how many reached it and went on, and the win rate; won and lost stages are marked by outcome

```sh
acme-crm pipelines show [pipeline]
```

| Argument | | What it is |
|---|---|---|
| `pipeline` | optional | pipeline:<id>, or a name only one of the CRM's pipelines has; needed unless the CRM has one pipeline in all. |

**Returns:** pipeline — id, ref, name, kind, account, external_id, stages, created_at, and 3 more; every field: acme-crm commands info pipelines show

**Example:** `acme-crm work pipelines show pipeline:3`, `acme-crm work pipelines show Sales --json`

## `acme-crm stages`

the stages of the CRM's pipelines, as last synced

### `acme-crm stages list`

every stage of the CRM's pipelines in order, with its outcome and how many are open in it

```sh
acme-crm stages list [query]
```

| Argument | | What it is |
|---|---|---|
| `query` | optional | field:value terms that narrow the list — the fields are below. |

**Returns:** stage — name, position, outcome, external_id, open, pipeline, pipeline_name, kind, and 5 more; every field: acme-crm commands info stages list

**Example:** `acme-crm work stages list --json`, `acme-crm work stages list kind:lead`

## `acme-crm fields`

the CRM's own fields on deals, leads, people and organizations, as last synced

### `acme-crm fields list`

the CRM's custom fields of one kind, in its order, with a list field's options

```sh
acme-crm fields list <kind> [query] [options]
```

| Argument | | What it is |
|---|---|---|
| `kind` | required | deals, people, organizations. |
| `query` | optional | field:value terms; this list filters by none yet. |

| Option | What it does |
|---|---|
| `--limit <n>` | fields per page, 1–500. Default: `50`. |
| `--page <n>` | which page, starting at 1. |
| `--all` | every field, no paging. |

**Returns:** crm field — code, label, type, multiple, filterable, untrusted, options; every field: acme-crm commands info fields list

**Example:** `acme-crm work fields list deals`, `acme-crm work fields list people --json`

## `acme-crm search`

search what the local store holds

### `acme-crm search all`

search the CRM's deals and leads by the words of their title, company, contacts and activities, and the messages, notes, calendar events and meetings other WireCat tools stored — best match first. Use it when you do not know where something was written

```sh
acme-crm search all <query> [options]
```

| Argument | | What it is |
|---|---|---|
| `query` | required | words and "phrases"; deals and leads match the words of their title, company, contacts and activities. |

| Option | What it does |
|---|---|
| `--only <resources>` | only these resources, separated by commas: crm, messages, notes, events, meetings. |
| `--source <accounts>` | only these accounts, separated by commas: provider:account as a hit shows it, a provider, a kind or group:<name>; each resource reads the ones of its kind. |
| `--limit <n>` | how many. |
| `--page <n>` | which page, starting at 1. |
| `--exact` | bare words and quotes match their exact form only, as exact:word does. |
| `--timezone <zone>` | the IANA timezone for calendar date boundaries. |

**Returns:** hit — kind, ref, provider, account, title, timestamp, excerpt, url, and 18 more; every field: acme-crm commands info search all

**Example:** `acme-crm work search all Example LLC`, `acme-crm work search all website --only crm --json`

## `acme-crm doctor`

the state this installation is in, without connecting unless --online

```sh
acme-crm doctor [options]
```

| Option | What it does |
|---|---|
| `--online` | also connect once and read the account; sends nothing. |

**Example:** `acme-crm doctor`, `acme-crm doctor --json`

### `acme-crm doctor reports`

problem reports

#### `acme-crm doctor reports show`

what a problem report holds; writes nothing

```sh
acme-crm doctor reports show
```

**Example:** `acme-crm doctor reports show`

#### `acme-crm doctor reports create`

write a problem report to a file, and say where to send it

**Changes something on this computer only.**

```sh
acme-crm doctor reports create [options]
```

| Option | What it does |
|---|---|
| `--run <id>` | the run the report is about; the newest failed one if not given. |
| `--output <file>` | where to write it; a new file in this directory if not given. |

**Example:** `acme-crm doctor reports create --output ./problem-report.json`

## `acme-crm skill`

the instructions an agent is given for this tool

### `acme-crm skill show`

print SKILL.md — `acme-crm skill install` puts it where Claude Code, Codex, Gemini CLI and OpenClaw look for it, and where Hermes does on request; --for prints the copy already there

```sh
acme-crm skill show [options]
```

| Option | What it does |
|---|---|
| `--for <agents>` | print the copy installed for these agents instead of this version's. One of: `claude`, `agents`. |

**Example:** `acme-crm skill show`

### `acme-crm skill install`

write SKILL.md to \~/.claude/skills/leemour-acme-crm-cli/ (Claude Code) and \~/.agents/skills/leemour-acme-crm-cli/ (Codex, Gemini CLI, OpenClaw); --for hermes also has Hermes read \~/.agents/skills, which changes Hermes's own settings, so all leaves it out

**Changes something on this computer only.**

```sh
acme-crm skill install [options]
```

| Option | What it does |
|---|---|
| `--for <agents>` | which agents to install for. One of: `claude`, `agents`, `hermes`, `all`. Default: `all`. |

**Example:** `acme-crm skill install --for agents`

### `acme-crm skill status`

for each place `acme-crm skill install` writes to, and for the copy Hermes reads: the path, the version installed there, and whether it is current, stale, missing or unversioned

```sh
acme-crm skill status
```

**Example:** `acme-crm skill status`, `acme-crm skill status --json`

## `acme-crm mcp`

serve this profile to an agent over MCP and set it up — `claude mcp add acme-crm -- acme-crm <profile> mcp serve`

### `acme-crm mcp serve`

serve this profile to an agent over MCP, on stdin and stdout — `claude mcp add acme-crm -- acme-crm <profile> mcp serve`; `acme-crm mcp serve --profiles a,b` or `--profiles all` serves those profiles from one server and each tool asks which

**Changes something in the service.**

```sh
acme-crm mcp serve [options]
```

| Option | What it does |
|---|---|
| `--permission <key=level>` | make a permission stricter for this server only, like contacts.show=deny; it never loosens the profile; repeat for more keys. |
| `--profiles <names\|all>` | serve several profiles from one server instead of one: names, comma-separated, or all for every profile. |
| `--http` | serve over HTTP on 127.0.0.1 for ChatGPT and Claude in the browser, behind your tunnel; the profile's permissions decide. |
| `--port <port>` | the local port for --http (default 8765). |
| `--public-url <url>` | the tunnel's https address the browser apps use, e.g. https://<name>.ts.net or https://<name>.ts.net/tg. |

**Example:** `acme-crm personal mcp serve`, `acme-crm mcp serve --profiles work,personal`, `acme-crm personal mcp serve --http --public-url https://laptop.example.ts.net`

### `acme-crm mcp revoke`

forget every login `mcp serve --http` gave a browser app, of this profile or of the server `--profiles` names; each app must log in again

**Changes something on this computer only.**

```sh
acme-crm mcp revoke [options]
```

| Option | What it does |
|---|---|
| `--profiles <names\|all>` | serve several profiles from one server instead of one: names, comma-separated, or all for every profile. |

**Example:** `acme-crm personal mcp revoke`, `acme-crm mcp revoke --profiles all`

### `acme-crm mcp server`

start, stop and check `mcp serve --http` in the background; status shows the login code for a browser app

#### `acme-crm mcp server start`

start `mcp serve --http` apart from this shell and answer once it listens, with its login code

**Changes something on this computer only.**

```sh
acme-crm mcp server start [options]
```

| Option | What it does |
|---|---|
| `--port <port>` | the local port (default 8765). |
| `--public-url <url>` | the tunnel's https address the browser apps use, e.g. https://<name>.ts.net or https://<name>.ts.net/tg. |
| `--permission <key=level>` | make a permission stricter for this server only; repeat for more keys. |
| `--profiles <names\|all>` | the server of several profiles that `mcp serve --profiles` serves: names, comma-separated, or all. |

**Example:** `acme-crm personal mcp server start --public-url https://laptop.example.ts.net`

#### `acme-crm mcp server stop`

stop `mcp serve --http` — only one that `mcp server start` started

**Changes something on this computer only.**

```sh
acme-crm mcp server stop [options]
```

| Option | What it does |
|---|---|
| `--profiles <names\|all>` | the server of several profiles that `mcp serve --profiles` serves: names, comma-separated, or all. |

**Example:** `acme-crm personal mcp server stop`

#### `acme-crm mcp server status`

whether `mcp serve --http` runs, on which port and address, the login code for a new browser app, and the apps logged in

```sh
acme-crm mcp server status [options]
```

| Option | What it does |
|---|---|
| `--profiles <names\|all>` | the server of several profiles that `mcp serve --profiles` serves: names, comma-separated, or all. |

**Example:** `acme-crm personal mcp server status --json`

### `acme-crm mcp config`

print the mcpServers entry for Claude Desktop, Cursor and others, with full paths; writes nothing

```sh
acme-crm mcp config [options]
```

| Option | What it does |
|---|---|
| `--permission <key=level>` | make a permission stricter for this server only, like contacts.show=deny; it never loosens the profile; repeat for more keys. |
| `--profiles <names\|all>` | serve several profiles from one server instead of one: names, comma-separated, or all for every profile. |

**Example:** `acme-crm personal mcp config`, `acme-crm mcp config --profiles all`

### `acme-crm mcp add`

add this profile's local MCP server to Codex or Claude Code

**Changes something on this computer only.**

```sh
acme-crm mcp add <client> [options]
```

| Argument | | What it is |
|---|---|---|
| `client` | required | codex or claude-code. |

| Option | What it does |
|---|---|
| `--allow-writes` | acknowledge that this profile offers writing tools. |
| `--permission <key=level>` | make a permission stricter for this server only, like contacts.show=deny; it never loosens the profile; repeat for more keys. |

**Example:** `acme-crm personal mcp add codex --allow-writes`

### `acme-crm mcp check`

check this profile's local MCP handshake and tool list

```sh
acme-crm mcp check [options]
```

| Option | What it does |
|---|---|
| `--permission <key=level>` | make a permission stricter for this server only, like contacts.show=deny; it never loosens the profile; repeat for more keys. |

**Example:** `acme-crm personal mcp check`

## `acme-crm upgrade`

upgrade acme-crm with the package manager that installed it; --check only looks

**Changes something on this computer only.**

```sh
acme-crm upgrade [options]
```

| Option | What it does |
|---|---|
| `--check` | say whether a newer version exists, and install nothing. |

**Example:** `acme-crm upgrade --check`

## `acme-crm config`

the settings in force, and where each one came from

### `acme-crm config show`

the profile, the profiles that exist, and each setting with where it came from

```sh
acme-crm config show
```

**Example:** `acme-crm personal config show`

### `acme-crm config set`

save a setting to the configuration file

**Changes something on this computer only.**

```sh
acme-crm config set <setting> <value> [options]
```

| Argument | | What it is |
|---|---|---|
| `setting` | required | one of: limit, timeout_ms, color, record, record_input, keep_runs_for_days, keep_successful_runs_for_days, keep_store_runs_for_days, runs_size_limit_mb, permissions, requests_per_minute, search_reranker, embedding_provider, embedding_model, embedding_base_url, embedding_dims, models, update_check, skill_hint, search_stemmers.cyrillic, search_stemmers.latin, owner_languages, crm.<provider>:<account>.links, crm.<provider>:<account>.company-types, crm.<provider>:<account>.scope, crm.<provider>:<account>.unassigned, crm.<provider>:<account>.self, crm.<provider>:<account>.stage-tasks, crm.<provider>:<account>.activities. |
| `value` | required | a number, true or false; for a group tg:work,max:Alice,email:me@x. |

| Option | What it does |
|---|---|
| `--defaults` | change what every profile gets, rather than this profile. |

**Example:** `acme-crm personal config set limit 20`

### `acme-crm config unset`

remove a setting from the configuration file

**Changes something on this computer only.**

```sh
acme-crm config unset <setting> [options]
```

| Argument | | What it is |
|---|---|---|
| `setting` | required | one of: limit, timeout_ms, color, record, record_input, keep_runs_for_days, keep_successful_runs_for_days, keep_store_runs_for_days, runs_size_limit_mb, permissions, requests_per_minute, search_reranker, embedding_provider, embedding_model, embedding_base_url, embedding_dims, models, update_check, skill_hint, search_stemmers.cyrillic, search_stemmers.latin, owner_languages, crm.<provider>:<account>.links, crm.<provider>:<account>.company-types, crm.<provider>:<account>.scope, crm.<provider>:<account>.unassigned, crm.<provider>:<account>.self, crm.<provider>:<account>.stage-tasks, crm.<provider>:<account>.activities. |

| Option | What it does |
|---|---|
| `--defaults` | change what every profile gets, rather than this profile. |

**Example:** `acme-crm personal config unset limit`

### `acme-crm config migrate`

write each setting the file lacks at its default, keeping yours

**Changes something on this computer only.**

```sh
acme-crm config migrate
```

**Example:** `acme-crm config migrate`

### `acme-crm config repair`

fix broken JSON syntax in the settings file — comments, a missing or extra comma, unquoted keys, single quotes, missing closing brackets at the end — keeping every value, with a backup beside it; refuses anything with more than one reading and changes nothing then

**Changes something on this computer only.**

```sh
acme-crm config repair [options]
```

| Option | What it does |
|---|---|
| `--dry-run` | say what it would fix, and change nothing. |

**Example:** `acme-crm config repair`, `acme-crm config repair --dry-run`

## `acme-crm runs`

recorded runs — what this tool did, and when

### `acme-crm runs list`

recorded runs, newest first

```sh
acme-crm runs list [query] [options]
```

| Argument | | What it is |
|---|---|---|
| `query` | optional | field:value terms that narrow the list — the fields are below. |

| Option | What it does |
|---|---|
| `--limit <n>` | how many to show. Default: `20`. |
| `--page <n>` | which page, starting at 1. Default: `1`. |

**Returns:** run — run_id, command, started_at, status, cli_version, profile, completed_at, requests, and 23 more; every field: acme-crm commands info runs list

**Example:** `acme-crm personal runs list --limit 10`

### `acme-crm runs show`

one run: what it was, how it ended, and every event it logged

```sh
acme-crm runs show <run-id> [options]
```

| Argument | | What it is |
|---|---|---|
| `run-id` | required | an id from `acme-crm runs list`. |

| Option | What it does |
|---|---|
| `--problems` | only failed responses, warnings and crashes. |

**Returns:** run details — run_id, command, started_at, status, cli_version, directory, event_count, events, and 22 more; every field: acme-crm commands info runs show

**Example:** `acme-crm personal runs show run-101`

### `acme-crm runs path`

the directory holding one run

```sh
acme-crm runs path <run-id>
```

| Argument | | What it is |
|---|---|---|
| `run-id` | required | an id from `acme-crm runs list`. |

**Returns:** run location — path; every field: acme-crm commands info runs path

**Example:** `acme-crm personal runs path run-101`

## Exit codes

Branch on the code, not on the text: the text can change, the code does not.

| Code | When |
|---|---|
| `0` | it worked |
| `2` | `validation_error` |
| `3` | `configuration_error` |
| `4` | `authentication_error` |
| `5` | `permission_error` |
| `6` | `not_found` |
| `7` | `confirmation_required` |
| `8` | `rate_limited` |
| `9` | `timeout` |
| `10` | `network_error` |
| `11` | `provider_error` |
| `12` | `provider_unavailable` |
| `13` | `invalid_response` |
| `14` | `outcome_unknown` |
| `15` | `conflict` |
| `130` | `cancelled` |
| `1` | anything else |
