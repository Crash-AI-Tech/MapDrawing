import type { StrokeData, GeoBounds } from '../types';
import { latLngToTile } from '../types/viewport';

const TILE_PAGE_SIZE = 500;
const MAX_PAGES_PER_LOAD = 5;

export interface TileManagerConfig {
  apiBaseUrl: string;
  zoomLevel?: number;
  cacheExpiration?: number;
}

interface TileCursor {
  createdAt: number;
  id: string;
}

interface TileState {
  loadedAt: number;
  loading: boolean;
  /** A cursor means the tile is only partially loaded and must resume next time. */
  cursor: TileCursor | null;
}

interface TilePage {
  items: StrokeData[];
  nextCursor: TileCursor | null;
}

export class TileManager {
  private apiBaseUrl: string;
  private zoomLevel: number;
  private cacheExpiration: number;
  private tiles = new Map<string, TileState>();
  private abortController: AbortController | null = null;

  constructor(config: TileManagerConfig) {
    this.apiBaseUrl = config.apiBaseUrl;
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

      const deduped = new Map<string, StrokeData>();
      for (const strokes of pages) {
        for (const stroke of strokes) deduped.set(stroke.id, stroke);
      }
      return [...deduped.values()];
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
    initialCursor: TileCursor | null,
    signal: AbortSignal,
  ): Promise<TilePage> {
    const [z, x, y] = key.split('/').map(Number);
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
    } while (cursor && page < MAX_PAGES_PER_LOAD);

    return { items: [...items.values()], nextCursor: cursor };
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
