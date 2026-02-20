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

    constructor(config: TileManagerConfig) {
        this.apiBaseUrl = config.apiBaseUrl;
        this.zoomLevel = config.zoomLevel ?? 14;
        this.cacheExpiration = config.cacheExpiration ?? 5 * 60 * 1000;
    }

    /**
     * Determine which tiles are needed for the given bounds,
     * find the ones not loaded or expired, and fetch them.
     * Returns ALL strokes for the requested area (including cached ones if needed, 
     * but usually the Engine already has them. We just return new ones).
     */
    async fetchMissingTiles(bounds: GeoBounds): Promise<StrokeData[]> {
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

        // Fetch all missing tiles in parallel
        const allNewStrokes: StrokeData[] = [];

        await Promise.all(missingTiles.map(async (key) => {
            try {
                const [z, x, y] = key.split('/').map(Number);
                const tileBounds = tileToBounds(x, y, z);

                const params = new URLSearchParams({
                    minLat: tileBounds.minLat.toString(),
                    maxLat: tileBounds.maxLat.toString(),
                    minLng: tileBounds.minLng.toString(),
                    maxLng: tileBounds.maxLng.toString(),
                    zoom: z.toString(), // Tell API this is a tile fetch (optional usage)
                    limit: '1000' // Fetch more for tiles
                });

                const res = await fetch(`${this.apiBaseUrl}/drawings?${params}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data: any = await res.json();
                const items = Array.isArray(data) ? data : (data.items || []);

                allNewStrokes.push(...items);

                // Mark as loaded
                this.tiles.set(key, { loadedAt: Date.now(), loading: false });
            } catch (e) {
                console.error(`[TileManager] Failed to fetch tile ${key}:`, e);
                // Reset loading state so we can retry later
                this.tiles.delete(key);
            }
        }));

        return allNewStrokes;
    }

    /** Calculate tile keys covering a geographic bounding box */
    private getTilesCoveringBounds(bounds: GeoBounds): string[] {
        const { minLat, maxLat, minLng, maxLng } = bounds;
        const z = this.zoomLevel;

        // Top-Left (NW)
        const tl = latLngToTile(maxLat, minLng, z);
        // Bottom-Right (SE)
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
        this.tiles.clear();
    }
}
