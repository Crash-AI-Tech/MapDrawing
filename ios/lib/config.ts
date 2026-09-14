/** Public production endpoint. Secrets must never be exposed through EXPO_PUBLIC_*. */
const PRODUCTION_API_URL = 'https://map.wisebamboo.fun';
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

/**
 * Every committed build uses production. Local developers may temporarily
 * override the public URL to use Wrangler on their own machine.
 */
export const API_BASE_URL = (
  configuredBaseUrl || PRODUCTION_API_URL
).replace(/\/$/, '');

export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim() ||
  'https://tiles.openfreemap.org/styles/liberty';
