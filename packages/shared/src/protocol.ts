import type { DrawEvent, StrokeData } from './types';

/** Brushes accepted by every current client and by the API. */
export const BRUSH_IDS = {
  PENCIL: 'pencil',
  ERASER: 'eraser',
} as const;

export type BrushId = (typeof BRUSH_IDS)[keyof typeof BRUSH_IDS];

/** Read-only compatibility for historical strokes. Never expose these as tools. */
export const LEGACY_BRUSH_IDS = {
  MARKER: 'marker',
  SPRAY: 'spray',
  HIGHLIGHTER: 'highlighter',
} as const;

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
  'https://doc-hosting.flycricket.io/drawmaps-terms-of-use/2197a713-a352-47c7-bf8f-a5a19eee3ddb/terms';
export const PRIVACY_POLICY_URL =
  'https://doc-hosting.flycricket.io/drawmaps-privacy-policy/ab08a782-7dc0-48b1-97c9-e4ce1ac47c55/privacy';

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

export const OFFLINE_QUEUE_VERSION = 1 as const;
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
  const type = (value as { type?: unknown }).type;
  return type === 'STROKE_ADD' || type === 'STROKE_DELETE' ||
    type === 'STROKE_UPDATE' || type === 'CURSOR_MOVE';
}

/** Upgrade both historical Web queue items and raw iOS events to v1. */
export function normalizeOfflineQueue(
  value: unknown,
  createId: () => string,
  now = Date.now(),
): OfflineQueueItem[] {
  if (!Array.isArray(value)) return [];

  const items: OfflineQueueItem[] = [];
  for (const entry of value) {
    let event: DrawEvent | undefined;
    let id = createId();
    let createdAt = now;
    let attempts = 0;

    if (isDrawEvent(entry)) {
      event = entry;
    } else if (entry && typeof entry === 'object') {
      const candidate = entry as Record<string, unknown>;
      if (isDrawEvent(candidate.event)) event = candidate.event;
      if (typeof candidate.id === 'string' && candidate.id) id = candidate.id;
      const storedTime = candidate.createdAt ?? candidate.timestamp;
      if (typeof storedTime === 'number' && Number.isFinite(storedTime)) createdAt = storedTime;
      if (typeof candidate.attempts === 'number' && Number.isFinite(candidate.attempts)) {
        attempts = Math.max(0, Math.trunc(candidate.attempts));
      }
    }

    if (!event || now - createdAt > OFFLINE_QUEUE_MAX_AGE_MS) continue;
    items.push({ version: OFFLINE_QUEUE_VERSION, id, event, createdAt, attempts });
  }

  return items.sort((a, b) => a.createdAt - b.createdAt);
}
