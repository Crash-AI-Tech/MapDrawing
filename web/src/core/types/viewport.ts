import type { GeoBounds } from './stroke';

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

/** Convert lat/lng to tile coordinates at given zoom */
export function latLngToTile(lat: number, lng: number, zoom: number): TileCoord {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { z: zoom, x, y };
}

/** Get tile key string for room naming */
export function getTileKey(lat: number, lng: number, zoom: number = 14): string {
  const tile = latLngToTile(lat, lng, zoom);
  return `${tile.z}/${tile.x}/${tile.y}`;
}

/** Convert tile coordinates to lat/lng bounds */
export function tileToBounds(x: number, y: number, z: number): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const n = Math.pow(2, z);
  const minLng = (x / n) * 360 - 180;
  const maxLng = ((x + 1) / n) * 360 - 180;

  // Mercator projection reverse
  const latRad1 = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const latRad2 = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));

  // latRad1 is the "top" (higher latitude if y is smaller), latRad2 is "bottom"
  // But wait, tile Y goes from 0 (North) to N (South).
  // So y=0 -> 85.05, y=max -> -85.05.
  // We need to return minLat, maxLat.
  // latRad1 corresponds to y (Top edge), latRad2 corresponds to y+1 (Bottom edge).
  // So maxLat is latRad1, minLat is latRad2.

  const lat1 = (latRad1 * 180) / Math.PI;
  const lat2 = (latRad2 * 180) / Math.PI;

  return {
    minLat: Math.min(lat1, lat2),
    maxLat: Math.max(lat1, lat2),
    minLng,
    maxLng,
  };
}
