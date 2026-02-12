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
