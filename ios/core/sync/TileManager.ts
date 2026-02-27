import type { StrokeData, GeoBounds } from '../types';
import { getTileKey, tileToBounds } from '../types';
import { fetchDrawings } from '../../lib/api';

export interface TileManagerConfig {
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
    private zoomLevel: number;
    private cacheExpiration: number;

    /** Track loaded tiles: "z/x/y" -> state */
    private tiles = new Map<string, TileState>();

    /** AbortController for cancelling in-flight requests */
    private abortController: AbortController | null = null;

    constructor(config: TileManagerConfig = {}) {
        this.zoomLevel = config.zoomLevel ?? 14;
        this.cacheExpiration = config.cacheExpiration ?? 5 * 60 * 1000;
    }

    /**
     * Cancel any in-flight tile fetches.
     * Called automatically when a new fetchMissingTiles starts.
     */
    cancelInFlight() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;

            // Reset all tiles that were in "loading" state back to unfetched.
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
        // Cancel previous fetch batch
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
            const data = await fetchDrawings({
                minLat: mergedMinLat,
                maxLat: mergedMaxLat,
                minLng: mergedMinLng,
                maxLng: mergedMaxLng,
                zoom: this.zoomLevel,
                limit: 5000,
                signal: controller.signal,
            });

            const items = data.items || [];

            // Mark all missing tiles as loaded
            for (const key of missingTiles) {
                this.tiles.set(key, { loadedAt: Date.now(), loading: false });
            }

            return items;
        } catch (e: any) {
            if (e?.name === 'AbortError') return [];
            console.error(`[TileManager] Failed to fetch merged tiles:`, e?.message);
            // Reset loading state so we can retry later
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

        const n = Math.pow(2, z);

        const getTileXY = (lat: number, lng: number) => {
            const x = Math.floor(((lng + 180) / 360) * n);
            const latRad = (lat * Math.PI) / 180;
            const y = Math.floor(
                ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
            );
            return { x, y };
        };

        const tl = getTileXY(maxLat, minLng);
        const br = getTileXY(minLat, maxLng);

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
