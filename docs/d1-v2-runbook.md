# D1 v2 migration runbook

The v2 database is a clean baseline. Do not apply it to the existing production or staging database.

1. Create a new empty D1 database for staging or production.
2. Replace the matching `database_id` in the Wrangler config on a release branch.
3. Preview the copy plan. The command prints counts only and never prints account data:

   `node scripts/migrate-d1-v2.mjs --source map-db --target map-db-v2`

4. Run the copy only after confirming both database names:

   `node scripts/migrate-d1-v2.mjs --source map-db --target map-db-v2 --apply`

The script applies the v2 baseline, copies users and active sessions, initializes ink to 100, and validates counts. It intentionally discards drawings, pins, reports, blocks, verification codes, old ink balances, and rate-limit rows. Avatar URLs are retained; production should keep the existing avatar R2 bucket when switching databases.

Cloudflare secrets are not stored in Git. Before deploying a new Worker environment, configure `AUTH_SECRET`, `RESEND_API_KEY`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` with `wrangler secret put`.
