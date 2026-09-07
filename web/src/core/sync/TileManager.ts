import { ViewportTileLoader, type TilePage } from '@niubi/shared';

export class TileManager extends ViewportTileLoader {
  constructor(config: { apiBaseUrl: string; zoomLevel?: number; cacheExpiration?: number }) {
    super(async (tile, cursor, signal) => {
      const params = new URLSearchParams({ z: String(tile.z), x: String(tile.x), y: String(tile.y), limit: '200' });
      if (cursor) { params.set('cursorCreatedAt', String(cursor.createdAt)); params.set('cursorId', cursor.id); }
      const response = await fetch(`${config.apiBaseUrl}/drawings/tile?${params}`, { signal });
      if (!response.ok) throw new Error(`Tile HTTP ${response.status}`);
      return response.json() as Promise<TilePage>;
    }, config.cacheExpiration, config.zoomLevel);
  }
}
