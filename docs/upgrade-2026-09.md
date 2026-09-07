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
- [x] Commit/push implementation to main (`b78cca1`).
- [x] Deploy the updated Web/backend to the single staging environment and rerun API smoke tests.
- [x] Queue iOS 1.3.0 build 29 through the normal EAS build workflow (no automatic submission).
- [ ] Deploy production Web/backend after acceptance, complete native build validation, submit iOS and record exact App Store/TestFlight status.

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
- Final staging release `915c53cd-8a70-4653-8917-48c3f218502c` also passed the expanded smoke test, including the sixth verification attempt returning 429. URL: https://map-staging.privacy2privacy.workers.dev . R2 upload retries succeeded with `opennextjs-cloudflare deploy --config wrangler.staging.toml --cacheChunkSize 2`.
- Browser control fails with a missing bundled `browser-service.mjs`; retry/reset did not fix it. Computer Use also reports native pipe startup failure. Alternative Playwright permission requested before visual testing.
- iOS simulator skill requires permission to boot an unstarted simulator; all simulators were shutdown. Boot/test permission requested.
- Expo token authentication succeeds; existing production iOS credentials/build history are reachable.
- EAS build `1d2a90e2-ef9c-4c76-8e97-a173060e7ce0` was accepted for 1.3.0/build 29, using production API configuration and the existing managed signing credentials. Build status: https://expo.dev/accounts/nsaviour/projects/ios/builds/1d2a90e2-ef9c-4c76-8e97-a173060e7ce0 . No TestFlight upload or review submission has been requested yet.
- The desktop Apple API key returned HTTP 401. Reading private key material from Expo was refused by the safety approval layer; no alternate extraction was attempted. App Store metadata/privacy/review operations remain gated on valid authorized credentials or a working signed-in browser.

### Known limits

This is the first bounded-loading release, not the historical snapshot/LOD milestone. Dense views can intentionally show partial history and ask the user to zoom in; absolute rendering budgets are safeguards, not fidelity/capacity proof. Offline storage still depends on browser/OS storage availability. Visual acceptance, 100/500/1,000-client staging measurements and Apple analytics privacy declarations remain release/follow-up gates as indicated above. No production data has been reset.

### Acceptance follow-up

- User authorized standalone Playwright and simulator boot. iPhone 17 Pro (iOS 26.4) is booted.
- Real Playwright desktop/mobile inspection completed. Guest trial, authentication without canvas reload, explicit publication, persisted undo/redo, offline recovery and eraser cursor passed using `scripts/staging-browser.mjs`; fixtures were removed. English/Japanese language switching also inspected.
- Fixed login destroying Web practice strokes. Native auth now dismisses back to the existing canvas rather than replacing it with a new instance. Added acknowledged-deletion guards so stale tile data cannot resurrect local undo/deletion.
- Staging D1 read replication is `auto`; authenticated API/cache invalidation smoke tests passed afterward. Sessions API semantics: https://developers.cloudflare.com/d1/best-practices/read-replication/ . This is not a load test.
- Production iOS build 29 finished; simulator build `b8af16a6-01cf-43b1-9859-e36434795b3a` finished. Both precede the acceptance fixes above and must not be submitted as the final fixed release.
- Added the `simulator` EAS profile, using the same single staging backend. CocoaPods is not installed locally; use `eas build -p ios --profile simulator` for an installable simulator archive.
- App Store Connect login is open in the isolated visible browser; user sign-in requested. No private key extraction is attempted.

### Product report

Run `wrangler d1 execute map-db-v2 --remote --config web/wrangler.toml --file scripts/product-report.sql` from the repository root with the usual private Cloudflare credentials. This report contains aggregate numbers only. Client counters are events, not unique visitors; authenticated activity and D7 return begin at this release and do not reconstruct historical visits. Apple privacy disclosures must include account-linked product interaction data for analytics before App Store review.

### Rollback

Record the previous Worker version before deployment. Roll back the Worker/client if needed; additive schema tables can stay. Do not delete tables, users, strokes or pins to roll back. Avoid resetting EAS build numbers. Keep 1.2 clients usable while 1.3 passes review.
