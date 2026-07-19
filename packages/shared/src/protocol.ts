import type { DrawEvent, StrokeData } from './types';

/** Brushes accepted by every current client and by the API. */
export const BRUSH_IDS = {
  PENCIL: 'pencil',
  ERASER: 'eraser',
} as const;

export type BrushId = (typeof BRUSH_IDS)[keyof typeof BRUSH_IDS];

const supportedBrushIds = new Set<string>(Object.values(BRUSH_IDS));

export function isSupportedBrushId(value: unknown): value is BrushId {
  return typeof value === 'string' && supportedBrushIds.has(value);
}

export interface PageCursor {
  createdAt: number;
  id: string;
}

export interface TilePage<T = StrokeData> {
  items: T[];
  nextCursor: PageCursor | null;
}

export interface SaveDrawingsResponse {
  ok: boolean;
  count: number;
  ink?: number;
  duplicate?: boolean;
}

export interface InkBalanceResponse {
  ink: number;
  maxInk: number;
}

export interface UserProfileStats {
  pins: number;
  drawings: number;
}

export interface BlockedUser {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  blockedAt: number;
}

export interface BlockedUsersResponse {
  items: BlockedUser[];
}

export const TERMS_OF_SERVICE_URL =
  'https://map.wisebamboo.fun/legal/terms';
export const PRIVACY_POLICY_URL =
  'https://map.wisebamboo.fun/legal/privacy';

export const SUPPORTED_LANGUAGES = ['zh', 'en', 'ja'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type HttpFailureDisposition = 'retry' | 'auth' | 'permanent';

/**
 * Cross-platform HTTP retry contract.
 * Authentication and quota/validation failures require user action and must
 * never be replayed indefinitely from an offline queue.
 */
export function classifyHttpFailure(status: number): HttpFailureDisposition {
  if (status === 401 || status === 403) return 'auth';
  if (status === 408 || status === 429 || status >= 500) return 'retry';
  return 'permanent';
}

export function shouldRetryHttpStatus(status: number): boolean {
  return classifyHttpFailure(status) === 'retry';
}

export const OFFLINE_QUEUE_VERSION = 2 as const;
export const OFFLINE_QUEUE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface OfflineQueueItem {
  version: typeof OFFLINE_QUEUE_VERSION;
  id: string;
  event: DrawEvent;
  createdAt: number;
  attempts: number;
}

function isDrawEvent(value: unknown): value is DrawEvent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as {
    type?: unknown;
    stroke?: { brushId?: unknown };
    strokeId?: unknown;
    patches?: { brushId?: unknown };
  };
  if (candidate.type === 'STROKE_ADD') {
    return !!candidate.stroke && isSupportedBrushId(candidate.stroke.brushId);
  }
  if (candidate.type === 'STROKE_UPDATE') {
    return typeof candidate.strokeId === 'string' && !!candidate.patches &&
      (candidate.patches.brushId === undefined || isSupportedBrushId(candidate.patches.brushId));
  }
  if (candidate.type === 'STROKE_DELETE') return typeof candidate.strokeId === 'string';
  return candidate.type === 'CURSOR_MOVE';
}

/** Parse only the current queue contract; incompatible local data is discarded. */
export function parseOfflineQueue(
  value: unknown,
  now = Date.now(),
): OfflineQueueItem[] {
  if (!Array.isArray(value)) return [];

  const items: OfflineQueueItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as Record<string, unknown>;
    if (
      candidate.version !== OFFLINE_QUEUE_VERSION ||
      typeof candidate.id !== 'string' ||
      !candidate.id ||
      !isDrawEvent(candidate.event) ||
      typeof candidate.createdAt !== 'number' ||
      !Number.isFinite(candidate.createdAt) ||
      typeof candidate.attempts !== 'number' ||
      !Number.isFinite(candidate.attempts) ||
      now - candidate.createdAt > OFFLINE_QUEUE_MAX_AGE_MS
    ) continue;
    items.push({
      version: OFFLINE_QUEUE_VERSION,
      id: candidate.id,
      event: candidate.event,
      createdAt: candidate.createdAt,
      attempts: Math.max(0, Math.trunc(candidate.attempts)),
    });
  }

  return items.sort((a, b) => a.createdAt - b.createdAt);
}
