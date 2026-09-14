# Cloudflare production footprint

MapDrawing intentionally uses one production environment. The Web frontend and
API service are built into one OpenNext Worker and released atomically.

## Active resources

- Worker: `map`
- D1: `map-db-v2`
- R2 uploads: `map-storage`
- R2 incremental cache: `map-next-cache`
- KV cache/presence namespace: `map-worker-CACHE`
- Custom domain: `map.wisebamboo.fun`

The authoritative bindings live in `server/cloudflare/wrangler.toml`. Secrets
remain in Cloudflare and must not be committed.

## Removed on 2026-09-15

- Worker: `map-staging`
- D1: `map-db-staging-v2`, `map-db`
- R2: `map-storage-staging`, `map-next-cache-staging`
- KV: `map-worker-staging-CACHE`

Before removal, all users in the legacy `map-db` were confirmed present in
`map-db-v2`. Staging-only content and legacy drawing databases were intentionally
discarded. Production `map-db-v2` and both production R2 buckets were untouched.
