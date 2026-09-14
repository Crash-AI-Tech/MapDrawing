// ========================
// Drawing Tool Constants (Shared)
// ========================

export * from '@mapdrawing/contracts';

// ========================
// Environment Specific Constants
// ========================

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL ||
  'https://tiles.openfreemap.org/styles/liberty';

