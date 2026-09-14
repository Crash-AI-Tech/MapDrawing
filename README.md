# MapDrawing

DrawMaps is a collaborative map canvas for travelers, city explorers and local communities. Users draw, erase and leave pins on a real map. Web and iOS share one protocol, and the service runs on Cloudflare Workers with D1, R2 and KV.

## Repository

- `docs/`: current documentation and archived design records
- `web/`: Next.js Web client and thin API route adapters
- `server/`: service code, shared contracts, D1 migrations and Cloudflare configuration
- `ios/`: Expo / React Native iOS client

Only workspace-level files remain at the repository root.

## Install and verify

Use Node.js 22 LTS and pnpm 9:

```bash
nvm use
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

## Local development

Docker is not required. Wrangler emulates D1, R2 and KV:

```bash
cp server/cloudflare/.dev.vars.example server/cloudflare/.dev.vars
pnpm db:migrate
pnpm dev
```

The Web app normally runs at `http://localhost:3000`. To connect iOS to the local service, temporarily provide the computer's LAN address:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000 pnpm --filter ios ios
```

Without an override, every iOS/EAS profile connects to the sole production service at `https://map.wisebamboo.fun`.

## Production deployment

MapDrawing has one Cloudflare environment and one release command:

```bash
pnpm deploy
```

The command builds the OpenNext application and deploys Worker `map` using `server/cloudflare/wrangler.toml`. The Web frontend and service are separate source packages but remain one atomic Worker deployment, preserving same-origin authentication and avoiding CORS or split-release failures.

Cloudflare, Resend and Apple secrets stay in provider secret stores. Never commit them or expose them through `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` variables.
