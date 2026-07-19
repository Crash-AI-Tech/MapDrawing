/** Public API endpoints. Secrets must never be exposed through EXPO_PUBLIC_*. */
const API_ENDPOINTS = {
  staging: 'https://map-staging.privacy2privacy.workers.dev',
  production: 'https://map.wisebamboo.fun',
} as const;

type ApiEnvironment = keyof typeof API_ENDPOINTS;

const requestedEnvironment = process.env.EXPO_PUBLIC_API_ENV?.trim();
const apiEnvironment: ApiEnvironment = requestedEnvironment === 'production'
  ? 'production'
  : 'staging';
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

/**
 * This branch defaults to staging so a fresh checkout is safe to test.
 * Override with EXPO_PUBLIC_API_BASE_URL for a LAN server, or select production
 * explicitly with EXPO_PUBLIC_API_ENV=production.
 */
export const API_BASE_URL = (
  configuredBaseUrl || API_ENDPOINTS[apiEnvironment]
).replace(/\/$/, '');

export const API_ENVIRONMENT = apiEnvironment;

export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim() ||
  'https://tiles.openfreemap.org/styles/liberty';
