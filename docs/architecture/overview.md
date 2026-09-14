# Current architecture

MapDrawing uses four repository areas: documentation, Web, service and iOS. The source packages have explicit ownership even though Web and service are deployed atomically as one OpenNext Cloudflare Worker.

```text
Web UI ───────┐
              ├── @mapdrawing/contracts
iOS ──────────┘

Next route adapters ── @mapdrawing/server ── D1 / R2 / KV / Resend / Apple
```

## Boundaries

- `web/` owns browser UI, map rendering, marketing pages and Next.js routing adapters.
- `server/` owns API implementations, authentication, persistence, email, Cloudflare bindings and shared wire contracts.
- `ios/` owns the Expo/React Native application and never imports server runtime code.
- `server/packages/contracts/` contains runtime-neutral types, constants and deterministic synchronization utilities used by both clients and the service.
- Web API adapters and Server Action adapters contain no business decisions; they only expose server functions to Next.js.

The application intentionally uses one production environment. Local validation uses Wrangler's emulated bindings and temporary local data.
