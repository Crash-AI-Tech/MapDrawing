import { tilesForBounds, type GeoBounds } from './types';

export const TILE_SYNC_ZOOM = 14;
export const TILE_PAGE_SIZE = 500;
export const MAX_TILE_PAGES_PER_LOAD = 5;
export const MAX_VIEWPORT_TILES = 200;
export const DEFAULT_TILE_CACHE_EXPIRATION_MS = 5 * 60 * 1000;

export interface TileCoordinate {
  z: number;
  x: number;
  y: number;
}
export function tileCoordinateToKey(tile: TileCoordinate): string {
  return `${tile.z}/${tile.x}/${tile.y}`;
}

export function parseTileKey(key: string): TileCoordinate | null {
  const parts = key.split('/').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return null;
  const [z, x, y] = parts;
  return { z, x, y };
}

export function tileKeysForBounds(
  bounds: GeoBounds,
  zoom = TILE_SYNC_ZOOM,
  maxTiles = MAX_VIEWPORT_TILES,
): string[] {
  return tilesForBounds(bounds, zoom, maxTiles).map(tileCoordinateToKey);
}

export function dedupeById<T extends { id: string }>(groups: readonly (readonly T[])[]): T[] {
  const items = new Map<string, T>();
  for (const group of groups) {
    for (const item of group) items.set(item.id, item);
  }
  return [...items.values()];
}
