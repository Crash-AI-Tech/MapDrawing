import type { StrokeData, GeoBounds } from '../types';
import {
  DEFAULT_TILE_CACHE_EXPIRATION_MS,
  MAX_TILE_PAGES_PER_LOAD,
  TILE_PAGE_SIZE,
  TILE_SYNC_ZOOM,
  dedupeById,
  parseTileKey,
  tileKeysForBounds,
  type PageCursor,
  type TilePage,
} from '@niubi/shared';

export interface TileManagerConfig {
  apiBaseUrl: string;
  zoomLevel?: number;
  cacheExpiration?: number;
}

interface TileState {
  loadedAt: number;
  loading: boolean;
  /** A cursor means the tile is only partially loaded and must resume next time. */
  cursor: PageCursor | null;
}

export class TileManager {
  private apiBaseUrl: string;
  private zoomLevel: number;
  private cacheExpiration: number;
  private tiles = new Map<string, TileState>();
  private abortController: AbortController | null = null;

  constructor(config: TileManagerConfig) {
    this.apiBaseUrl = config.apiBaseUrl;
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
      const pages = await Promise.all(
        needed.map(async (key) => {
          const initialCursor = this.tiles.get(key)?.cursor ?? null;
          const result = await this.fetchTile(key, initialCursor, controller.signal);
          this.tiles.set(key, {
            loadedAt: Date.now(),
            loading: false,
            cursor: result.nextCursor,
          });
          return result.items;
        }),
      );

      return dedupeById(pages);
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === 'AbortError') return [];
      console.error('[TileManager] Failed to fetch tiles:', error);
      for (const key of needed) {
        const state = this.tiles.get(key);
        if (state) this.tiles.set(key, { ...state, loading: false });
      }
      return [];
    } finally {
      if (this.abortController === controller) this.abortController = null;
    }
  }

  private async fetchTile(
    key: string,
    initialCursor: PageCursor | null,
    signal: AbortSignal,
  ): Promise<TilePage> {
    const tile = parseTileKey(key);
    if (!tile) throw new Error(`Invalid tile key: ${key}`);
    const { z, x, y } = tile;
    const items = new Map<string, StrokeData>();
    let cursor = initialCursor;
    let page = 0;

    do {
      const params = new URLSearchParams({
        z: String(z),
        x: String(x),
        y: String(y),
        limit: String(TILE_PAGE_SIZE),
      });
      if (cursor) {
        params.set('cursorCreatedAt', String(cursor.createdAt));
        params.set('cursorId', cursor.id);
      }
      const response = await fetch(`${this.apiBaseUrl}/drawings/tile?${params}`, { signal });
      if (!response.ok) throw new Error(`Tile ${key} returned HTTP ${response.status}`);
      const data = await response.json() as TilePage;
      for (const stroke of data.items ?? []) items.set(stroke.id, stroke);
      cursor = data.nextCursor;
      page += 1;
    } while (cursor && page < MAX_TILE_PAGES_PER_LOAD);

    return { items: [...items.values()], nextCursor: cursor };
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
