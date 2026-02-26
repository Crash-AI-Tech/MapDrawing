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
            // Without this, aborted tiles stay stuck as loading:true forever
            // and all future fetchMissingTiles calls skip them → 0 strokes.
            for (const [key, state] of this.tiles) {
                if (state.loading) {
                    this.tiles.delete(key);
                }
            }
        }
    }

    /**
     * Determine which tiles are needed for the given bounds,
     * find the ones not loaded or expired, and fetch them.
     * Automatically cancels any previous in-flight fetch.
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

            // If not loaded, or expired, and not currently loading -> fetch it
            if (!state || (now - state.loadedAt > this.cacheExpiration && !state.loading)) {
                missingTiles.push(tileKey);
                this.tiles.set(tileKey, { loadedAt: state?.loadedAt ?? 0, loading: true });
            }
        }

        if (missingTiles.length === 0) {
            return [];
        }

        // Fetch missing tiles with concurrency limit (max 3 concurrent)
        const allNewStrokes: StrokeData[] = [];
        const MAX_CONCURRENT = 3;

        for (let i = 0; i < missingTiles.length; i += MAX_CONCURRENT) {
            // Check if this fetch was cancelled
            if (controller.signal.aborted) return allNewStrokes;

            const batch = missingTiles.slice(i, i + MAX_CONCURRENT);
            await Promise.all(batch.map(async (key) => {
                if (controller.signal.aborted) return;

                const [z, x, y] = key.split('/').map(Number);
                const tileBounds = tileToBounds(x, y, z);

                try {
                    const data = await fetchDrawings({
                        minLat: tileBounds.minLat,
                        maxLat: tileBounds.maxLat,
                        minLng: tileBounds.minLng,
                        maxLng: tileBounds.maxLng,
                        zoom: z,
                        limit: 1000,
                        signal: controller.signal,
                    });

                    const items = data.items || [];
                    allNewStrokes.push(...items);

                    // Mark as loaded
                    this.tiles.set(key, { loadedAt: Date.now(), loading: false });
                } catch (e: any) {
                    if (e?.name === 'AbortError') return; // silently ignore aborted
                    console.error(`[TileManager] Failed to fetch tile ${key}:`, e?.message);
                    // Reset loading state so we can retry later
                    this.tiles.delete(key);
                }
            }));
        }

        return allNewStrokes;
    }

    /** Calculate tile keys covering a geographic bounding box */
    private getTilesCoveringBounds(bounds: GeoBounds): string[] {
        const { minLat, maxLat, minLng, maxLng } = bounds;
        const z = this.zoomLevel;

        const n = Math.pow(2, z);

        // Helper to get tile x,y from lat/lng
        const getTileXY = (lat: number, lng: number) => {
            const x = Math.floor(((lng + 180) / 360) * n);
            const latRad = (lat * Math.PI) / 180;
            const y = Math.floor(
                ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
            );
            return { x, y };
        };

        // Top-Left (NW) -> maxLat, minLng
        const tl = getTileXY(maxLat, minLng);
        // Bottom-Right (SE) -> minLat, maxLng
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
