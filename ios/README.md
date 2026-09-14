# DrawMaps iOS

The iOS client is an Expo/React Native app using Expo Router, MapLibre, and Skia. It consumes the platform-neutral protocol from `server/packages/contracts`.

## Local development

Use Node.js 22 LTS and install dependencies from the repository root:

```bash
nvm use
pnpm install --frozen-lockfile
pnpm --filter ios ios
```

Committed builds use `https://map.wisebamboo.fun`. To use Wrangler on another machine, temporarily set a public URL without committing the local address:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000 pnpm --filter ios ios
```

The canonical app identity is defined only in `ios/app.json`: bundle identifier `com.niubi.agent` and EAS project `c31ea0d0-e723-4ff2-9a5b-3baddcdd6176`. Environment profiles live in `ios/eas.json`.

## Verification

```bash
pnpm --filter ios type-check
pnpm --filter ios lint
pnpm --filter ios exec expo export --platform ios
```

Public `EXPO_PUBLIC_*` values may be committed. Cloudflare, Apple server, email, and signing secrets must remain in their provider secret stores and must never be bundled into the app.
