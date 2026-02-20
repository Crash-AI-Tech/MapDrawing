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

    constructor(config: TileManagerConfig = {}) {
        this.zoomLevel = config.zoomLevel ?? 14;
        this.cacheExpiration = config.cacheExpiration ?? 5 * 60 * 1000;
    }

    /**
     * Determine which tiles are needed for the given bounds,
     * find the ones not loaded or expired, and fetch them.
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

                const data = await fetchDrawings({
                    minLat: tileBounds.minLat,
                    maxLat: tileBounds.maxLat,
                    minLng: tileBounds.minLng,
                    maxLng: tileBounds.maxLng,
                    zoom: z,
                    limit: 1000
                });

                const items = data.items || [];
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
        this.tiles.clear();
    }
}
