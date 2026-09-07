# September upgrade — implementation and release plan

## Scope and safety

Preserve the playful yellow landing page, shared pencil/eraser protocol and existing accounts/content. Ship compatible API additions before the new clients. Do not reset databases or run load tests against production. No marketing posts are sent by this release.

## Release 1.3

- [x] Correct Web pin clusters, pagination and stale viewport requests.
- [x] Share bounded tile loading between Web/iOS; refresh stationary views, reconcile confirmed remote deletions and recover evicted content.
- [x] Cache historical Web rendering separately from live input; budget point data and requests.
- [x] Serialize durable writes and batch adjacent strokes; preserve add/delete ordering and retry safety.
- [x] Version public tile caches.
- [ ] Enable D1 read replication after staging verification; no production capacity qualification yet.
- [x] Add privacy-minimal product counters and authenticated activity for activation/retention, with account-deletion cleanup.
- [x] Improve first creation: guided zoom, useful entry points, localized save states, consistent controls (visual acceptance pending).
- [x] Share a map location, not just a generic canvas; simplify technical landing copy without replacing its visual identity.
- [x] Verify shared contracts, database migrations, Web/iOS types and staging API smoke tests.
- [ ] Verify Web and native iOS visual interaction, native build and production release gates.
- [ ] Commit/push main, deploy production Web/backend, build/submit iOS 1.3.0 and record exact release status.

## Validation gates

Test out-of-order viewport responses, interrupted pagination, evict/revisit, remote deletion, offline add/delete, partial duplicate retries, authenticated identity changes, pin clusters at zoom 20, shared coordinates and invalid input. Production receives only read-only smoke checks. iOS upload/TestFlight availability/App Store review are separate milestones, never reported interchangeably.

## Follow-up capacity programme

In an isolated fixture environment test 100/500/1,000 clients and 1k/10k/100k strokes concentrated in one area. Measure p50/p95 API latency, SQL rows read/written, cache hit rate, error rate, frame time and memory. Versioned multi-resolution historical snapshots plus recent editable vectors are a later change, gated on moderation/deletion invalidation and fidelity tests; this release does not claim those capacities.

## Growth experiment after release

Recruit 20 non-team participants around one place/activity. Track successful first creation, sharing and seven-day return. Use clearly labelled official examples, genuine community posts and channel attribution; no fabricated activity or bulk outreach.

## Release evidence

- `pnpm check`: all schema migrations, Web/iOS type checks and both linters passed using Node 22.23.1. Shared regression suite now has 20 passing tests, including interrupted pagination, eviction/revisit, cancellation, point budgets, expired authentication and partially rejected batches.
- iOS Metro/Hermes export passed. This is not a native build or simulator acceptance test.
- Production Web/OpenNext build passed. Initial sandbox build failed because Turbopack could not bind its compiler port; approved non-sandbox build succeeded.
- Staging D1 migrations 0002/0003 applied successfully, preserving existing data.
- Initial staging release `c379b098-f7e9-4d9d-ba08-6bc8c0bae0d2` passed authenticated API smoke tests: batched writes, partial duplicate retry, identity guard, ETag invalidation after deletion, pin clusters/raw pins, counters and account-linked statistics cleanup. The exact temporary account/content were removed afterward.
- Browser control fails with a missing bundled `browser-service.mjs`; retry/reset did not fix it. Computer Use also reports native pipe startup failure. Alternative Playwright permission requested before visual testing.
- iOS simulator skill requires permission to boot an unstarted simulator; all simulators were shutdown. Boot/test permission requested.
- Expo token authentication succeeds; existing production iOS credentials/build history are reachable.
- The desktop Apple API key returned HTTP 401. Reading private key material from Expo was refused by the safety approval layer; no alternate extraction was attempted. App Store metadata/privacy/review operations remain gated on valid authorized credentials or a working signed-in browser.

### Known limits

This is the first bounded-loading release, not the historical snapshot/LOD milestone. Dense views can intentionally show partial history and ask the user to zoom in; absolute rendering budgets are safeguards, not fidelity/capacity proof. Offline storage still depends on browser/OS storage availability. Visual acceptance, 100/500/1,000-client staging measurements and Apple analytics privacy declarations remain release/follow-up gates as indicated above. No production data has been reset.

### Product report

Run `wrangler d1 execute map-db-v2 --remote --config web/wrangler.toml --file scripts/product-report.sql` from the repository root with the usual private Cloudflare credentials. This report contains aggregate numbers only. Client counters are events, not unique visitors; authenticated activity and D7 return begin at this release and do not reconstruct historical visits. Apple privacy disclosures must include account-linked product interaction data for analytics before App Store review.

### Rollback

Record the previous Worker version before deployment. Roll back the Worker/client if needed; additive schema tables can stay. Do not delete tables, users, strokes or pins to roll back. Avoid resetting EAS build numbers. Keep 1.2 clients usable while 1.3 passes review.
