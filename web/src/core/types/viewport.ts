import type { GeoBounds } from './stroke';

// Re-export shared tile utilities
export { getTileKey, latLngToTile, tileToBounds, tilesForBounds } from '@niubi/shared';

/** Viewport state — represents what the user currently sees */
export interface ViewState {
  /** Center longitude */
  lng: number;
  /** Center latitude */
  lat: number;
  /** Zoom level */
  zoom: number;
  /** Bearing in degrees */
  bearing: number;
  /** Pitch in degrees */
  pitch: number;
}

/** Screen-space rectangle */
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Coordinate conversion utilities interface */
export interface CoordinateConverter {
  /** Convert screen pixel coordinates to geographic coordinates */
  screenToGeo(screenX: number, screenY: number): { lng: number; lat: number };
  /** Convert geographic coordinates to screen pixel coordinates */
  geoToScreen(lng: number, lat: number): { x: number; y: number };
  /** Get current viewport bounds in geographic coordinates */
  getViewportBounds(): GeoBounds;
  /** Get current view state */
  getViewState(): ViewState;
}

/** Tile key for spatial partitioning */
export interface TileCoord {
  z: number;
  x: number;
  y: number;
}
