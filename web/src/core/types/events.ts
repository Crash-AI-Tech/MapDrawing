import type { StrokeData } from './stroke';

/** Drawing events — immutable event stream */
export type DrawEvent =
  | StrokeAddEvent
  | StrokeDeleteEvent
  | StrokeUpdateEvent
  | CursorMoveEvent;

export interface StrokeAddEvent {
  type: 'STROKE_ADD';
  stroke: StrokeData;
  /** Sequence number assigned by Source DO */
  seq?: number;
  /** Server timestamp */
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

/** Role in the drawing room */
export type UserRole = 'drawer' | 'observer' | 'queued';
