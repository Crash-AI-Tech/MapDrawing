// ========================
// Drawing Tool Constants (Shared)
// ========================

export * from '@niubi/shared';

// ========================
// Environment Specific Constants
// ========================

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL ||
  'https://tiles.openfreemap.org/styles/liberty';

export const DO_WEBSOCKET_URL = process.env.NEXT_PUBLIC_DO_WEBSOCKET_URL || '';
