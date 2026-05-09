/**
 * Core types for the iOS drawing engine.
 * Re-exports shared types from @niubi/shared and adds iOS-specific types.
 */

// Re-export shared types as single source of truth
export type {
  StrokePoint,
  GeoBounds,
  StrokeData,
  DrawEvent,
  StrokeAddEvent,
  StrokeDeleteEvent,
  StrokeUpdateEvent,
  CursorMoveEvent,
  SyncMessage,
  SyncState,
} from '@niubi/shared';
export { getTileKey, tileToBounds } from '@niubi/shared';

// ========================
// iOS-specific Types
// ========================

export interface CameraState {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing: number;
  pitch: number;
}
