import type { StrokeData, GeoBounds } from '../types';
import { fetchDrawingTile, type PageCursor } from '../../lib/api';
import {
  DEFAULT_TILE_CACHE_EXPIRATION_MS,
  MAX_TILE_PAGES_PER_LOAD,
  TILE_PAGE_SIZE,
  TILE_SYNC_ZOOM,
  dedupeById,
  parseTileKey,
  tileKeysForBounds,
} from '@niubi/shared';

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
    this.zoomLevel = config.zoomLevel ?? TILE_SYNC_ZOOM;
    this.cacheExpiration = config.cacheExpiration ?? DEFAULT_TILE_CACHE_EXPIRATION_MS;
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
        const tile = parseTileKey(key);
        if (!tile) throw new Error(`Invalid tile key: ${key}`);
        const { z, x, y } = tile;
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
        } while (cursor && page < MAX_TILE_PAGES_PER_LOAD);

        this.tiles.set(key, { loadedAt: Date.now(), loading: false, cursor });
        return [...items.values()];
      }));

      return dedupeById(tileItems);
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
    try {
      return tileKeysForBounds(bounds, this.zoomLevel);
    } catch (error) {
      console.warn('[TileManager] Refusing viewport tile load:', error);
      return [];
    }
  }

  clearCache(): void {
    this.cancelInFlight();
    this.tiles.clear();
  }
}
