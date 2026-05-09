/**
 * usePresence — reports own cursor position & fetches remote cursors.
 *
 * Mirrors the web usePresence hook but uses apiFetch (Bearer token auth).
 * Cursors auto-expire after 15s TTL on the server.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface RemoteCursor {
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  color: string;
  ts: number;
}

const POLL_INTERVAL = 3000; // 3 seconds

interface PresenceOptions {
  /** Current map center latitude */
  lat: number;
  /** Current map center longitude */
  lng: number;
  /** Current drawing color */
  color: string;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
}

export function usePresence(options: PresenceOptions) {
  const { lat, lng, color, isAuthenticated } = options;
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const tick = useCallback(async () => {
    const { lat, lng, color, isAuthenticated } = optionsRef.current;
    if (!isAuthenticated) return;

    try {
      // Report own position
      await apiFetch('/api/presence', {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ lat, lng, color }),
      });

      // Fetch remote cursors
      const data = await apiFetch<{ cursors: RemoteCursor[] }>(
        `/api/presence?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
        { auth: true }
      );
      setCursors(data.cursors ?? []);
    } catch {
      // Silently ignore — presence is best-effort
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setCursors([]);
      return;
    }

    tick();
    intervalRef.current = setInterval(tick, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, tick]);

  return cursors;
}
