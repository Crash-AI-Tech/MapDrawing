import type { StrokeData, GeoBounds } from '../types';
import { latLngToTile, tileToBounds } from '../types/viewport';

export interface TileManagerConfig {
    /** API base URL */
    apiBaseUrl: string;
    /** Tile zoom level for caching (default: 14) */
    zoomLevel?: number;
    /** Cache expiration in ms (default: 5 minutes) */
    cacheExpiration?: number;
}

interface TileState {
    loadedAt: number;
    loading: boolean;
}

export class TileManager {
    private apiBaseUrl: string;
    private zoomLevel: number;
    private cacheExpiration: number;

    /** Track loaded tiles: "z/x/y" -> state */
    private tiles = new Map<string, TileState>();

    /** AbortController for cancelling in-flight request */
    private abortController: AbortController | null = null;

    constructor(config: TileManagerConfig) {
        this.apiBaseUrl = config.apiBaseUrl;
        this.zoomLevel = config.zoomLevel ?? 14;
        this.cacheExpiration = config.cacheExpiration ?? 5 * 60 * 1000;
    }

    /**
     * Cancel any in-flight fetch.
     */
    cancelInFlight() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;

            // Reset all loading tiles so they can be re-fetched
            for (const [key, state] of this.tiles) {
                if (state.loading) {
                    this.tiles.delete(key);
                }
            }
        }
    }

    /**
     * Determine which tiles are needed for the given bounds,
     * find the ones not loaded or expired, and fetch them
     * using ONE merged API request (instead of per-tile requests).
     */
    async fetchMissingTiles(bounds: GeoBounds): Promise<StrokeData[]> {
        // Cancel previous fetch
        this.cancelInFlight();

        const controller = new AbortController();
        this.abortController = controller;

        const missingTiles: string[] = [];
        const tilesInView = this.getTilesCoveringBounds(bounds);
        const now = Date.now();

        for (const tileKey of tilesInView) {
            const state = this.tiles.get(tileKey);
            if (!state || (now - state.loadedAt > this.cacheExpiration && !state.loading)) {
                missingTiles.push(tileKey);
                this.tiles.set(tileKey, { loadedAt: state?.loadedAt ?? 0, loading: true });
            }
        }

        if (missingTiles.length === 0) {
            return [];
        }

        // Compute bounding box of all missing tiles (merge into ONE request)
        let mergedMinLat = Infinity, mergedMaxLat = -Infinity;
        let mergedMinLng = Infinity, mergedMaxLng = -Infinity;

        for (const key of missingTiles) {
            const [z, x, y] = key.split('/').map(Number);
            const tb = tileToBounds(x, y, z);
            mergedMinLat = Math.min(mergedMinLat, tb.minLat);
            mergedMaxLat = Math.max(mergedMaxLat, tb.maxLat);
            mergedMinLng = Math.min(mergedMinLng, tb.minLng);
            mergedMaxLng = Math.max(mergedMaxLng, tb.maxLng);
        }

        try {
            const params = new URLSearchParams({
                minLat: mergedMinLat.toString(),
                maxLat: mergedMaxLat.toString(),
                minLng: mergedMinLng.toString(),
                maxLng: mergedMaxLng.toString(),
                zoom: this.zoomLevel.toString(),
                limit: '5000',
            });

            const res = await fetch(`${this.apiBaseUrl}/drawings?${params}`, {
                signal: controller.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data: any = await res.json();
            const items: StrokeData[] = Array.isArray(data) ? data : (data.items || []);

            // Mark all missing tiles as loaded
            for (const key of missingTiles) {
                this.tiles.set(key, { loadedAt: Date.now(), loading: false });
            }

            return items;
        } catch (e: any) {
            if (e?.name === 'AbortError') return [];
            console.error(`[TileManager] Failed to fetch merged tiles:`, e?.message);
            for (const key of missingTiles) {
                this.tiles.delete(key);
            }
            return [];
        }
    }

    /** Calculate tile keys covering a geographic bounding box */
    private getTilesCoveringBounds(bounds: GeoBounds): string[] {
        const { minLat, maxLat, minLng, maxLng } = bounds;
        const z = this.zoomLevel;

        const tl = latLngToTile(maxLat, minLng, z);
        const br = latLngToTile(minLat, maxLng, z);

        const keys: string[] = [];
        for (let x = tl.x; x <= br.x; x++) {
            for (let y = tl.y; y <= br.y; y++) {
                keys.push(`${z}/${x}/${y}`);
            }
        }
        return keys;
    }

    /** Clear cache (e.g. on force refresh) */
    clearCache() {
        this.cancelInFlight();
        this.tiles.clear();
    }
}
