#!/usr/bin/env bash
# The release's live check. This example's "service" is its built-in synthetic fake, so the check runs the built CLI
# end to end against it: sign in, sync into a store, read back, describe itself. Nothing touches the owner's store,
# keyring or folders.
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

export ACME_CRM_CONFIG_DIR="$work/config" ACME_CRM_STATE_DIR="$work/state" ACME_CRM_CACHE_DIR="$work/cache"
export MESSAGING_STORE="$work/wirecat.db"
export DBUS_SESSION_BUS_ADDRESS="disabled:"
unset ACME_CRM_BASE_URL ACME_CRM_TOKEN
cli=(node "$root/dist/bin/acme-crm.js")

pnpm --dir "$root" -s build >/dev/null

"${cli[@]}" --wcat-describe | node -e '
  const a = JSON.parse(require("fs").readFileSync(0, "utf8"))
  if (a.wcat_describe !== 2 || !/^[0-9a-f]{64}$/.test(a.manifest_sha256)) throw new Error("describe is not format 2")'

printf 'acme_test_live\n' | "${cli[@]}" live session start --credential-storage file --json >/dev/null
"${cli[@]}" live sync --json >"$work/sync.json"
"${cli[@]}" live deals list --json >"$work/deals.json"
"${cli[@]}" live contacts show per_01 --json >"$work/contact.json"
"${cli[@]}" live doctor --json >/dev/null

node -e '
  const read = (f) => JSON.parse(require("fs").readFileSync(f, "utf8"))
  const deals = read(process.argv[1]), contact = read(process.argv[2])
  const items = deals.items ?? deals.deals ?? deals
  if (!Array.isArray(items) || items.length !== 15) throw new Error(`expected 15 deals, got ${JSON.stringify(deals).slice(0, 200)}`)
  if (!JSON.stringify(contact).includes("per_01")) throw new Error("contacts show per_01 did not answer")' \
  "$work/deals.json" "$work/contact.json"

"${cli[@]}" live session end --json >/dev/null
echo "live check passed: sign-in, sync, 15 deals, contact per_01, doctor, describe format 2"
