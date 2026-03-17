/**
 * API client for the iOS app.
 *
 * - Reads session token from SecureStore
 * - Attaches Bearer token to authenticated requests
 * - Provides typed helpers for all backend endpoints
 */

import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';
import type { StrokeData } from '@/core/types';

// ========================
// Generic fetch wrapper
// ========================

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('session');
  } catch {
    return null;
  }
}

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  auth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Fetch with automatic auth token injection.
 * Throws on non-2xx responses.
 * Supports AbortSignal for request cancellation.
 */
export async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = false, headers = {}, signal, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...headers,
  };

  // Only set Content-Type for requests with a body (POST, PUT, PATCH)
  if (rest.body) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }

  if (auth) {
    const token = await getToken();
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, { headers: finalHeaders, signal, ...rest });

    if (!response.ok) {
      const body = await response.text();
      let message: string;
      try {
        const json = JSON.parse(body);
        message = json.detail || json.error || json.message || body;
      } catch {
        message = body;
      }
      throw new ApiError(response.status, message);
    }

    // Handle empty response (204)
    if (response.status === 204) return undefined as T;

    return response.json();
  } catch (error: any) {
    // Don't log intentionally aborted requests or expected auth failures
    if (error?.name !== 'AbortError' && error?.status !== 401) {
      console.error(`[apiFetch] ${url} failed:`, error?.message || error);
    }
    throw error;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ========================
// Pin type
// ========================

export interface MapPin {
  id: string;
  userId: string;
  userName: string;
  lng: number;
  lat: number;
  message: string;
  color: string;
  createdAt: number;
}

export interface PinCluster {
  type: 'cluster';
  id: string;
  lng: number;
  lat: number;
  count: number;
}

export interface PinItem extends MapPin {
  type: 'pin';
}

export interface PageCursor {
  createdAt: number;
  id: string;
}

// ========================
// Drawings API
// ========================

interface ViewportParams {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * GET /api/drawings — load strokes within viewport bounds.
 * No auth required.
 */
export async function fetchDrawings(
  params: ViewportParams & {
    zoom?: number;
    limit?: number;
    cursor?: PageCursor | null;
    signal?: AbortSignal;
  }
): Promise<{
  items: StrokeData[];
  nextCursor: PageCursor | null;
}> {
  const qs = new URLSearchParams({
    minLat: String(params.minLat),
    maxLat: String(params.maxLat),
    minLng: String(params.minLng),
    maxLng: String(params.maxLng),
    ...(params.zoom != null ? { zoom: String(params.zoom) } : {}),
    ...(params.limit != null ? { limit: String(params.limit) } : {}),
    ...(params.cursor
      ? {
        cursorCreatedAt: String(params.cursor.createdAt),
        cursorId: params.cursor.id,
      }
      : {}),
  }).toString();

  return apiFetch(`/api/drawings?${qs}`, { signal: params.signal });
}

/**
 * POST /api/drawings — persist strokes to D1.
 * Auth required.
 */
export async function saveDrawings(
  strokes: StrokeData | StrokeData[]
): Promise<{ ok: boolean; count: number }> {
  return apiFetch('/api/drawings', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(Array.isArray(strokes) ? strokes : [strokes]),
  });
}

/**
 * DELETE /api/drawings/:id — delete a stroke by ID.
 * Auth required.
 */
export async function deleteStroke(id: string): Promise<void> {
  return apiFetch(`/api/drawings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  });
}

// ========================
// Pins API
// ========================

/**
 * GET /api/pins — load pins within viewport bounds.
 * No auth required.
 */
export async function fetchPins(
  params: ViewportParams & {
    zoom?: number;
    limit?: number;
    cursor?: PageCursor | null;
  }
): Promise<{
  mode: 'raw' | 'clustered';
  items: Array<PinItem | PinCluster>;
  nextCursor: PageCursor | null;
}> {
  const qs = new URLSearchParams({
    minLat: String(params.minLat),
    maxLat: String(params.maxLat),
    minLng: String(params.minLng),
    maxLng: String(params.maxLng),
    ...(params.zoom != null ? { zoom: String(params.zoom) } : {}),
    ...(params.limit != null ? { limit: String(params.limit) } : {}),
    ...(params.cursor
      ? {
        cursorCreatedAt: String(params.cursor.createdAt),
        cursorId: params.cursor.id,
      }
      : {}),
  }).toString();

  return apiFetch(`/api/pins?${qs}`);
}

/**
 * POST /api/pins — create a new map pin.
 * Auth required.
 */
export async function createPin(pin: {
  lng: number;
  lat: number;
  message: string;
  color: string;
}): Promise<MapPin> {
  return apiFetch<MapPin>('/api/pins', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(pin),
  });
}

// ========================
// Profile API
// ========================

export interface UserProfile {
  id: string;
  email: string;
  user_name: string;
  avatar_url: string | null;
}

export interface UserProfileStats {
  pins: number;
  drawings: number;
}

/**
 * GET /api/profile — fetch current user info.
 * Auth required.
 */
export async function fetchProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/profile', { auth: true });
}

/**
 * GET /api/profile/stats — fetch user statistics (pins, drawings).
 * Auth required.
 */
export async function fetchProfileStats(): Promise<UserProfileStats> {
  return apiFetch<UserProfileStats>('/api/profile/stats', { auth: true });
}

/**
 * DELETE /api/profile — anonymize + permanently delete the current user account.
 * Auth required.
 */
export async function deleteAccount(): Promise<void> {
  return apiFetch('/api/profile', { method: 'DELETE', auth: true });
}

// ========================
// Block API
// ========================

export interface BlockedUser {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  blockedAt: number;
}

/**
 * GET /api/block — list all blocked users.
 * Auth required.
 */
export async function fetchBlockedUsers(): Promise<{ items: BlockedUser[] }> {
  return apiFetch<{ items: BlockedUser[] }>('/api/block', { auth: true });
}

/**
 * POST /api/block — block a user by ID.
 * Auth required.
 */
export async function blockUserApi(blockedId: string): Promise<void> {
  return apiFetch('/api/block', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ blockedId }),
  });
}

/**
 * DELETE /api/block — unblock a user by ID.
 * Auth required.
 */
export async function unblockUserApi(blockedId: string): Promise<void> {
  return apiFetch('/api/block', {
    method: 'DELETE',
    auth: true,
    body: JSON.stringify({ blockedId }),
  });
}
