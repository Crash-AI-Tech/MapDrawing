/**
 * Core types for the iOS drawing engine.
 * Compatible with the web version's data model for cross-platform sync.
 */

export interface StrokePoint {
  /** longitude (when stored) / screen X (when drawing) */
  x: number;
  /** latitude (when stored) / screen Y (when drawing) */
  y: number;
  /** Pressure value [0, 1] */
  pressure: number;
  /** Timestamp in milliseconds */
  timestamp: number;
}

export interface GeoBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface StrokeData {
  id: string;
  userId: string;
  userName: string;
  brushId: string;
  color: string;
  opacity: number;
  /** Base size in CSS pixels (same as web) */
  size: number;
  /** Points stored as geo coordinates (lng, lat) */
  points: StrokePoint[];
  /** Spatial bounding box */
  bounds: GeoBounds;
  /** Zoom level when the stroke was created */
  createdZoom: number;
  /** Unix timestamp in milliseconds */
  createdAt: number;
}

export interface CameraState {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing: number;
  pitch: number;
}

// ========================
// Sync Types (Ported from Web)
// ========================

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

export interface SyncMessage {
  room: string;
  msgId: string;
  event: DrawEvent;
  senderId: string;
}

export type SyncState = 'connecting' | 'connected' | 'disconnected' | 'error';

// ========================
// Utils
// ========================

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
export function tileToBounds(x: number, y: number, z: number): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const n = Math.pow(2, z);
  const minLng = (x / n) * 360 - 180;
  const maxLng = ((x + 1) / n) * 360 - 180;

  // Mercator projection reverse
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
