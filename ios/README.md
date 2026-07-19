# DrawMaps iOS

The iOS client is an Expo/React Native app using Expo Router, MapLibre, and Skia. It shares the v2 drawing protocol in `packages/shared` with the Web client and Cloudflare Worker.

## Local development

Use Node.js 22 LTS and install dependencies from the repository root:

```bash
nvm use
pnpm install --frozen-lockfile
pnpm --filter ios ios:staging
```

`ios:staging` selects the committed staging API configuration. To use a backend running on another machine, temporarily set a public URL without committing the local address:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000 pnpm --filter ios ios
```

The canonical app identity is defined only in `ios/app.json`: bundle identifier `com.niubi.agent` and EAS project `c31ea0d0-e723-4ff2-9a5b-3baddcdd6176`. Environment profiles live in `ios/eas.json`.

## Verification

```bash
pnpm --filter ios type-check
pnpm --filter ios lint
EXPO_PUBLIC_API_ENV=staging pnpm --filter ios exec expo export --platform ios
```

Public `EXPO_PUBLIC_*` values may be committed. Cloudflare, Apple server, email, and signing secrets must remain in their provider secret stores and must never be bundled into the app.
