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
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return `${zoom}/${x}/${y}`;
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
