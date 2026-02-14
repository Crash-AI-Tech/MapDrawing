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
