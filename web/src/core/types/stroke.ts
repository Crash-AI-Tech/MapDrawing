// Re-export shared types as single source of truth
export type { StrokePoint, GeoBounds, StrokeData } from '@niubi/shared';

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
