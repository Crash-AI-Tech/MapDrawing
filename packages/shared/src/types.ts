/**
 * Core drawing types shared between web and iOS clients.
 * This is the single source of truth for cross-platform data models.
 */

// ========================
// Stroke Types
// ========================

/** Single sampled point in a stroke */
export interface StrokePoint {
  /** Longitude (when stored) / screen X (when drawing) */
  x: number;
  /** Latitude (when stored) / screen Y (when drawing) */
  y: number;
  /** Pressure [0, 1], defaults to 0.5 when no pen pressure is available */
  pressure: number;
  /** Pen tilt in X axis (degrees) — web only */
  tiltX?: number;
  /** Pen tilt in Y axis (degrees) — web only */
  tiltY?: number;
  /** Timestamp in ms (epoch) */
  timestamp: number;
}

/** Geographic bounding box */
export interface GeoBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

/** Full stroke data model — serializable, framework-agnostic */
export interface StrokeData {
  /** UUID */
  id: string;
  /** User who created this stroke */
  userId: string;
  /** Display name */
  userName: string;
  /** Brush type identifier */
  brushId: string;
  /** Hex color */
  color: string;
  /** Opacity [0, 1] */
  opacity: number;
  /** Base size in px */
  size: number;
  /** Array of sampled points */
  points: StrokePoint[];
  /** Bounding box for spatial indexing */
  bounds: GeoBounds;
  /** Zoom level at creation time */
  createdZoom: number;
  /** Unix timestamp ms */
  createdAt: number;
  /** Extension metadata */
  meta?: Record<string, unknown>;
}

// ========================
// Sync / Event Types
// ========================

/** Drawing events — immutable event stream */
export type DrawEvent =
  | StrokeAddEvent
  | StrokeDeleteEvent
  | StrokeUpdateEvent
  | CursorMoveEvent;

export interface StrokeAddEvent {
  type: 'STROKE_ADD';
  stroke: StrokeData;
  seq?: number;
  serverTs?: number;
}

export interface StrokeDeleteEvent {
  type: 'STROKE_DELETE';
  strokeId: string;
  userId: string;
  seq?: number;
  serverTs?: number;
}

export interface StrokeUpdateEvent {
  type: 'STROKE_UPDATE';
  strokeId: string;
  patches: Partial<StrokeData>;
  seq?: number;
  serverTs?: number;
}

export interface CursorMoveEvent {
  type: 'CURSOR_MOVE';
  userId: string;
  userName: string;
  position: [number, number]; // [lng, lat]
  color: string;
}

/** Sync message wrapper for WebSocket transport */
export interface SyncMessage {
  /** Room ID (tile key) */
  room: string;
  /** Client-generated message ID */
  msgId: string;
  /** The actual event payload */
  event: DrawEvent;
  /** Sender user ID */
  senderId: string;
}

/** Sync connection state */
export type SyncState = 'connecting' | 'connected' | 'disconnected' | 'error';

// ========================
// Tile Utilities
// ========================

/** Get tile key string for room naming */
export function getTileKey(lat: number, lng: number, zoom: number = 14): string {
  const { x, y } = latLngToTile(lat, lng, zoom);
  return `${zoom}/${x}/${y}`;
}

/** Convert a coordinate to a clamped Web Mercator tile coordinate. */
export function latLngToTile(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const clampedLng = Math.max(-180, Math.min(180 - Number.EPSILON, lng));
  const x = Math.floor(((clampedLng + 180) / 360) * n);
  const latRad = (clampedLat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

/** Return every tile intersecting a non-antimeridian geographic bounds. */
export function tilesForBounds(
  bounds: GeoBounds,
  zoom: number,
  maxTiles = 64,
): Array<{ z: number; x: number; y: number }> {
  if (bounds.minLng > bounds.maxLng) {
    throw new Error('Antimeridian bounds are not supported');
  }
  const topLeft = latLngToTile(bounds.maxLat, bounds.minLng, zoom);
  const bottomRight = latLngToTile(bounds.minLat, bounds.maxLng, zoom);
  const count =
    (bottomRight.x - topLeft.x + 1) *
    (bottomRight.y - topLeft.y + 1);
  if (count > maxTiles) {
    throw new Error(`Bounds intersects too many tiles (${count})`);
  }

  const result: Array<{ z: number; x: number; y: number }> = [];
  for (let x = topLeft.x; x <= bottomRight.x; x += 1) {
    for (let y = topLeft.y; y <= bottomRight.y; y += 1) {
      result.push({ z: zoom, x, y });
    }
  }
  return result;
}

/** Convert tile coordinates to lat/lng bounds */
export function tileToBounds(
  x: number,
  y: number,
  z: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const n = Math.pow(2, z);
  const minLng = (x / n) * 360 - 180;
  const maxLng = ((x + 1) / n) * 360 - 180;
  const latRad1 = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const latRad2 = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  const lat1 = (latRad1 * 180) / Math.PI;
  const lat2 = (latRad2 * 180) / Math.PI;
  return {
    minLat: Math.min(lat1, lat2),
    maxLat: Math.max(lat1, lat2),
    minLng,
    maxLng,
  };
}
