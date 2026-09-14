# DrawMaps Web

The Web client is a Next.js application. UI, browser drawing code, marketing pages and static assets live here.

Files under `src/app/api/` are intentionally tiny Next.js routing adapters. Their implementations live in `server/src/api/` and are compiled into the same OpenNext Worker.

```bash
pnpm --filter web dev
pnpm --filter web build
```

Public browser configuration belongs in `.env.local`; service secrets belong in `server/cloudflare/.dev.vars`.
