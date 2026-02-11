/** Single sampled point in a stroke */
export interface StrokePoint {
  /** Longitude */
  x: number;
  /** Latitude */
  y: number;
  /** Pressure [0, 1], defaults to 0.5 when no pen pressure is available */
  pressure: number;
  /** Pen tilt in X axis (degrees) */
  tiltX?: number;
  /** Pen tilt in Y axis (degrees) */
  tiltY?: number;
  /** Timestamp in ms (epoch) — used for velocity calculations */
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
  /** UUID v7 (time-ordered) */
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
  /** Base size in px @zoom18 */
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

/** Brush configuration passed to brush methods */
export interface BrushConfig {
  color: string;
  opacity: number;
  /** Current pixel size at current zoom */
  size: number;
  /** Base size @zoom18 */
  baseSize: number;
  /** Current pressure value */
  pressure: number;
}

/** R-tree item for spatial queries */
export interface StrokeRTreeItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  strokeId: string;
}
