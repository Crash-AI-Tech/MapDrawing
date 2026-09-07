# September upgrade — implementation and release plan

## Scope and safety

Preserve the playful yellow landing page, shared pencil/eraser protocol and existing accounts/content. Ship compatible API additions before the new clients. Do not reset databases or run load tests against production. No marketing posts are sent by this release.

## Release 1.3

- [x] Correct Web pin clusters, pagination and stale viewport requests.
- [x] Share bounded tile loading between Web/iOS; refresh stationary views, reconcile confirmed remote deletions and recover evicted content.
- [x] Cache historical Web rendering separately from live input; budget point data and requests.
- [x] Serialize durable writes and batch adjacent strokes; preserve add/delete ordering and retry safety.
- [x] Version public tile caches.
- [x] Enable D1 read replication after staging verification; no production capacity qualification yet.
- [x] Add privacy-minimal product counters and authenticated activity for activation/retention, with account-deletion cleanup.
- [x] Improve first creation: guided zoom, useful entry points, localized save states and consistent controls.
- [x] Share a map location, not just a generic canvas; simplify technical landing copy without replacing its visual identity.
- [x] Verify shared contracts, database migrations, Web/iOS types and staging API smoke tests.
- [x] Verify Web and native iOS visual interaction and native builds on staging.
- [x] Commit/push implementation to main (`b78cca1`).
- [x] Deploy the updated Web/backend to the single staging environment and rerun API smoke tests.
- [x] Queue iOS 1.3.0 build 29 through the normal EAS build workflow (no automatic submission).
- [x] Deploy production Web/backend after acceptance and verify preserved data and read-only production smoke checks.
- [x] Complete final native login/save validation and upload iOS to App Store Connect.
- [x] Confirm TestFlight internal availability and submit the 1.3.0 App Store review (approval pending).

## Validation gates

Test out-of-order viewport responses, interrupted pagination, evict/revisit, remote deletion, offline add/delete, partial duplicate retries, authenticated identity changes, pin clusters at zoom 20, shared coordinates and invalid input. Production receives only read-only smoke checks. iOS upload/TestFlight availability/App Store review are separate milestones, never reported interchangeably.

## Follow-up capacity programme

In an isolated fixture environment test 100/500/1,000 clients and 1k/10k/100k strokes concentrated in one area. Measure p50/p95 API latency, SQL rows read/written, cache hit rate, error rate, frame time and memory. Versioned multi-resolution historical snapshots plus recent editable vectors are a later change, gated on moderation/deletion invalidation and fidelity tests; this release does not claim those capacities.

## Growth experiment after release

Recruit 20 non-team participants around one place/activity. Track successful first creation, sharing and seven-day return. Use clearly labelled official examples, genuine community posts and channel attribution; no fabricated activity or bulk outreach.

## Initial release evidence (superseded where noted below)

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

This is the first bounded-loading release, not the historical snapshot/LOD milestone. Dense views can intentionally show partial history and ask the user to zoom in; absolute rendering budgets are safeguards, not fidelity/capacity proof. Offline storage still depends on browser/OS storage availability. The 100/500/1,000-client staging measurements remain a follow-up gate. No production data has been reset. Native acceptance and Apple submission status are recorded separately below.

### Acceptance follow-up

- User authorized standalone Playwright and simulator boot. iPhone 17 Pro (iOS 26.4) is booted.
- Real Playwright desktop/mobile inspection completed. Guest trial, authentication without canvas reload, explicit publication, persisted undo/redo, offline recovery and eraser cursor passed using `scripts/staging-browser.mjs`; fixtures were removed. English/Japanese language switching also inspected.
- Fixed login destroying Web practice strokes. Native auth now dismisses back to the existing canvas rather than replacing it with a new instance. Added acknowledged-deletion guards so stale tile data cannot resurrect local undo/deletion.
- Staging D1 read replication is `auto`; authenticated API/cache invalidation smoke tests passed afterward. Sessions API semantics: https://developers.cloudflare.com/d1/best-practices/read-replication/ . This is not a load test.
- Production iOS build 29 finished; simulator build `b8af16a6-01cf-43b1-9859-e36434795b3a` finished. Both precede the acceptance fixes above and must not be submitted as the final fixed release.
- Added the `simulator` EAS profile, using the same single staging backend. CocoaPods is not installed locally; use `eas build -p ios --profile simulator` for an installable simulator archive.
- User completed App Store Connect sign-in in the isolated visible browser. No private key extraction was attempted.

### Product report

Run `wrangler d1 execute map-db-v2 --remote --config web/wrangler.toml --file scripts/product-report.sql` from the repository root with the usual private Cloudflare credentials. This report contains aggregate numbers only. Client counters are events, not unique visitors; authenticated activity and D7 return begin at this release and do not reconstruct historical visits. Apple privacy disclosures must include account-linked product interaction data for analytics before App Store review.

### Production rollout, September 8

- Applied additive D1 migrations 0002/0003. Before/after counts: 13 accounts, 78 drawings, 9 pins; all preserved. Both staging and production D1 read replication now report `auto`.
- A full local production export was refused by the safety approval layer; it was not attempted through another path. Recorded the existing cloud Time Travel recovery bookmark instead: `00000043-00000000-000050df-a4e38e257ea1c0a34a957d99ff637cff` (time-limited provider retention applies).
- Previous Worker for rollback: `8af2e103-d124-4400-9ec7-633c63eeb450`. Initial 1.3 production deployment: `db35dfbc-a75f-4667-84cd-4b9a1a507981`. Production canvas HTTP 200, renders the updated UI, no uncaught browser errors. Browser production check disabled analytics and did not create accounts/content.
- Extended dense-tile test exposed D1's 100 bound-parameter ceiling. Replaced the ID placeholder list with `json_each(?)`; real staging test with 110 temporary strokes passed. Source: https://developers.cloudflare.com/d1/platform/limits/ . Staging patch Worker: `72b9328f-c608-4f67-8d2a-cae40d7b96f6`. Final production Worker: `93e17ec4-6e90-4feb-bac7-6ff7e98f1261`.
- Final production read-only checks: homepage, canvas, English terms, Chinese privacy, robots.txt, sitemap.xml and tile API all HTTP 200; tile conditional request HTTP 304; Playwright canvas has zero uncaught errors. Final database counts remain 13 accounts / 78 drawings / 9 pins.
- Simulator build `0f48032a-81a8-4876-8d76-768a241aea9b` passed cold launch, safe-area layout, guest drawing, undo/redo and opening the native sharing sheet. For AXe gesture tests use a small sampling delta (10) and duration 2 seconds; coarse deltas can generate too few points for a stroke.
- Added accessible button roles to login/profile and localized field/back labels; cancelling login now returns to the existing practice canvas. Final iOS source revision: `8eebc3f`. Simulator build `0ae4d5ee-663e-416f-95e5-f1de23d7b70a`; production 1.3.0/build 33: `d15f2f31-b5be-4748-90e2-489ce2d6d5be`. Earlier production builds 29/31 are superseded. Requests 30/32 failed before build creation; build numbers were not reset.
- Final simulator acceptance: guest drawing at zoom 18, cancelling login without losing practice, login retaining the original canvas, explicit publication, authenticated drawing, persisted undo/redo (D1 counts 2 → 1 → 2), relaunch retaining authentication and profile count 2. Account deletion through the native confirmation dialog removed the exact test account and both drawings; D1 subsequently confirmed zero accounts/content for that fixture. iPad Pro 13-inch and iPhone 17 Pro Max also passed launch/layout and guest drawing checks.
- App Store privacy: added account-linked product interaction for analytics, without tracking. User ID analytics purpose also updated. Cancelled the unreleased 1.2.0/build 28 entry and changed the editable draft to 1.3.0; existing live 1.1.0 remains available. Updated English (US/UK) and Simplified Chinese descriptions/release notes and configured automatic release after approval.
- EAS production build 33 finished. Upload submission `3708a824-bea5-4a9e-b0b2-e8beefa98ce9` reports `FINISHED`. This confirms upload, not App Store approval or TestFlight processing completion. EAS rejected the optional changelog parameter as Enterprise-only; normal submission without it succeeded, with testing notes to be entered in App Store Connect.
- App Store Connect subsequently reports build 33 processing complete, linked to the existing internal group Dev (avatar initials DE), with two invitations. Captured unmodified 1.3 screenshots on iPhone 17 Pro Max (1320×2868) and iPad Pro 13-inch (2064×2752); uploaded the new guide/drawing views and removed the old February screenshots from the editable 1.3 draft. Existing live release was not changed.
- Final App Store status at September 8, approximately 02:30 CST: **1.3.0 / build 33 — Waiting for Review**. Apple confirms one submitted item; automatic release after approval is selected. TestFlight build detail confirms the Dev internal group with two testers; bilingual test instructions were saved. Existing review credentials were verified via the normal production mobile login endpoint (HTTP 200), without changing that account or creating content.
- Updated screenshot sets for English (US), Simplified Chinese and English (UK), including old Chinese 6.3-inch overrides; inherited smaller-device screenshots use the new 6.9-inch set. App Store approval and physical-device/Apple Sign-In testing are not claimed complete. The simulator profile continues to use staging; the submitted production/TestFlight build uses https://map.wisebamboo.fun.

### Rollback

Record the previous Worker version before deployment. Roll back the Worker/client if needed; additive schema tables can stay. Do not delete tables, users, strokes or pins to roll back. Avoid resetting EAS build numbers. Keep 1.2 clients usable while 1.3 passes review.
