# DrawMaps service

This directory owns the service implementation and its Cloudflare resources.

- `src/api/`: API handlers exported through thin Next.js route adapters in `web/`
- `src/auth/`, `src/db/`, `src/email/`: server-only application code
- `packages/contracts/`: framework-neutral protocol shared by Web and iOS
- `db/`: D1 schema and migrations
- `cloudflare/`: the single production Worker configuration
- `scripts/`: database checks and production operations

The source boundary is separate even though OpenNext currently packages the Web app and service into the same `map` Worker. Client code must not import `server/src`; it may only consume `@mapdrawing/contracts`.

## Local development

Copy `cloudflare/.dev.vars.example` to `cloudflare/.dev.vars`, then run from the repository root:

```bash
pnpm db:migrate
pnpm dev
```

Wrangler emulates D1, R2 and KV locally; Docker is not required.

## Production

```bash
pnpm deploy
```

The release guard accepts only Worker `map` bound to D1 `map-db-v2`. Secrets remain in Cloudflare and are never committed.
