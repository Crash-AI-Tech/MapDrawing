import { ViewportTileLoader } from '@niubi/shared';
import { fetchDrawingTile } from '../../lib/api';

export class TileManager extends ViewportTileLoader {
  constructor(config: { zoomLevel?: number; cacheExpiration?: number } = {}) {
    super((tile, cursor, signal) => fetchDrawingTile({ ...tile, cursor, signal, limit: 200 }), config.cacheExpiration, config.zoomLevel);
  }
}
