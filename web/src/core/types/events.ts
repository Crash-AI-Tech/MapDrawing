// Re-export shared types as single source of truth
export type {
  DrawEvent,
  StrokeAddEvent,
  StrokeDeleteEvent,
  StrokeUpdateEvent,
  CursorMoveEvent,
  SyncMessage,
  SyncState,
} from '@niubi/shared';

/** Role in the drawing room */
export type UserRole = 'drawer' | 'observer' | 'queued';
