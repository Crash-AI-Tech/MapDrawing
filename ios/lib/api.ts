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

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('session');
  } catch {
    return null;
  }
}

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  auth?: boolean;
  headers?: Record<string, string>;
}

/**
 * Fetch with automatic auth token injection.
 * Throws on non-2xx responses.
 */
async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = false, headers = {}, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth) {
    const token = await getToken();
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, { headers: finalHeaders, ...rest });

  if (!response.ok) {
    const body = await response.text();
    let message: string;
    try {
      const json = JSON.parse(body);
      message = json.error || json.message || body;
    } catch {
      message = body;
    }
    throw new ApiError(response.status, message);
  }

  // Handle empty response (204)
  if (response.status === 204) return undefined as T;

  return response.json();
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

  return apiFetch(`/api/drawings?${qs}`);
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
  userName: string;
  avatarUrl: string | null;
}

/**
 * GET /api/profile — fetch current user info.
 * Auth required.
 */
export async function fetchProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/profile', { auth: true });
}
