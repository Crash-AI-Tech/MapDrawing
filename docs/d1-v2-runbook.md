# D1 v2 migration runbook

The v2 database is a clean baseline. Do not apply it to the existing production or staging database.

1. Create a new empty D1 database for staging or production.
2. Replace the matching `database_name` and `database_id` in the Wrangler config on a release branch. The migration tool resolves both source and target by name from the authenticated Cloudflare account and creates a private temporary Wrangler config containing both bindings.
3. Preview the copy plan. The command prints counts only and never prints account data:

   `node scripts/migrate-d1-v2.mjs --source map-db --target map-db-v2`

4. Run the copy only after confirming both database names:

   `node scripts/migrate-d1-v2.mjs --source map-db --target map-db-v2 --apply`

The script applies the v2 baseline, copies users and active sessions, initializes ink to 100, and validates counts. It intentionally discards drawings, pins, reports, blocks, verification codes, old ink balances, and rate-limit rows. Avatar URLs are retained; production should keep the existing avatar R2 bucket when switching databases.

Cloudflare secrets are not stored in Git. Before deploying a new Worker environment, configure `AUTH_SECRET`, `RESEND_API_KEY`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` with `wrangler secret put`.

## Optional legacy public-content import

The clean v2 migration intentionally omits public drawings and pins. If the preserved
legacy database must later be restored, use the one-time importer only after confirming
that the target v2 content tables are empty. It preserves users and sessions already in
the target, converts seconds to millisecond timestamps, generates the required z14 tile
index rows, and maps the retired `highlighter` brush to `pencil`.

```bash
node scripts/import-legacy-content-v2.mjs --source map-db --target map-db-v2
node scripts/import-legacy-content-v2.mjs --source map-db --target map-db-v2 --apply
```

The first command is read-only. The importer refuses a non-empty target content set and
validates source rows before it writes anything.
