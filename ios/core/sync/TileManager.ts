import type { StrokeData, GeoBounds } from '../types';
import { latLngToTile } from '../types';
import { fetchDrawingTile, type PageCursor } from '../../lib/api';

const TILE_PAGE_SIZE = 500;
const MAX_PAGES_PER_LOAD = 5;

export interface TileManagerConfig {
  zoomLevel?: number;
  cacheExpiration?: number;
}

interface TileState {
  loadedAt: number;
  loading: boolean;
  cursor: PageCursor | null;
}

export class TileManager {
  private zoomLevel: number;
  private cacheExpiration: number;
  private tiles = new Map<string, TileState>();
  private abortController: AbortController | null = null;

  constructor(config: TileManagerConfig = {}) {
    this.zoomLevel = config.zoomLevel ?? 14;
    this.cacheExpiration = config.cacheExpiration ?? 5 * 60 * 1000;
  }

  cancelInFlight(): void {
    this.abortController?.abort();
    this.abortController = null;
    for (const [key, state] of this.tiles) {
      if (state.loading) this.tiles.set(key, { ...state, loading: false });
    }
  }

  async fetchMissingTiles(bounds: GeoBounds): Promise<StrokeData[]> {
    this.cancelInFlight();
    const controller = new AbortController();
    this.abortController = controller;
    const now = Date.now();
    const needed = this.getTilesCoveringBounds(bounds).filter((key) => {
      const state = this.tiles.get(key);
      const shouldLoad = !state || state.cursor !== null || now - state.loadedAt > this.cacheExpiration;
      if (shouldLoad) {
        this.tiles.set(key, {
          loadedAt: state?.loadedAt ?? 0,
          loading: true,
          cursor: state?.cursor ?? null,
        });
      }
      return shouldLoad;
    });
    if (needed.length === 0) return [];

    try {
      const tileItems = await Promise.all(needed.map(async (key) => {
        const [z, x, y] = key.split('/').map(Number);
        const items = new Map<string, StrokeData>();
        let cursor = this.tiles.get(key)?.cursor ?? null;
        let page = 0;
        do {
          const response = await fetchDrawingTile({
            z,
            x,
            y,
            limit: TILE_PAGE_SIZE,
            cursor,
            signal: controller.signal,
          });
          for (const stroke of response.items ?? []) items.set(stroke.id, stroke);
          cursor = response.nextCursor;
          page += 1;
        } while (cursor && page < MAX_PAGES_PER_LOAD);

        this.tiles.set(key, { loadedAt: Date.now(), loading: false, cursor });
        return [...items.values()];
      }));

      const deduped = new Map<string, StrokeData>();
      for (const items of tileItems) {
        for (const stroke of items) deduped.set(stroke.id, stroke);
      }
      return [...deduped.values()];
    } catch (error: any) {
      if (error?.name === 'AbortError') return [];
      console.error('[TileManager] Failed to fetch tiles:', error?.message ?? error);
      for (const key of needed) {
        const state = this.tiles.get(key);
        if (state) this.tiles.set(key, { ...state, loading: false });
      }
      return [];
    } finally {
      if (this.abortController === controller) this.abortController = null;
    }
  }

  private getTilesCoveringBounds(bounds: GeoBounds): string[] {
    const z = this.zoomLevel;
    const topLeft = latLngToTile(bounds.maxLat, bounds.minLng, z);
    const bottomRight = latLngToTile(bounds.minLat, bounds.maxLng, z);
    const count =
      (bottomRight.x - topLeft.x + 1) *
      (bottomRight.y - topLeft.y + 1);
    if (count > 200) {
      console.warn(`[TileManager] Refusing to load ${count} tiles at once`);
      return [];
    }

    const keys: string[] = [];
    for (let x = topLeft.x; x <= bottomRight.x; x += 1) {
      for (let y = topLeft.y; y <= bottomRight.y; y += 1) {
        keys.push(`${z}/${x}/${y}`);
      }
    }
    return keys;
  }

  clearCache(): void {
    this.cancelInFlight();
    this.tiles.clear();
  }
}
