'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { DrawingEngine } from '@/core/engine/DrawingEngine';
import { useAuthStore } from '@/stores/authStore';
import { useDrawingStore } from '@/stores/drawingStore';

export interface RemoteCursor {
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  color: string;
  ts: number;
}

const POLL_INTERVAL = 3000; // 3 seconds

/**
 * usePresence — reports own cursor position and fetches remote cursors.
 *
 * Uses KV-backed /api/presence with zoom-10 tile partitioning.
 * Cursors auto-expire after 15s TTL on the server.
 */
export function usePresence(engine: DrawingEngine | null) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const user = useAuthStore((s) => s.user);
  const activeColor = useDrawingStore((s) => s.activeColor);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCenter = useRef<{ lat: number; lng: number } | null>(null);

  const tick = useCallback(async () => {
    if (!engine || !user) return;

    const vs = engine.viewport.getViewState();
    if (!vs) return;

    const { lat, lng } = vs;
    lastCenter.current = { lat, lng };

    try {
      // Report own position
      await fetch('/api/presence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, color: activeColor }),
      });

      // Fetch remote cursors
      const res = await fetch(
        `/api/presence?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
      );
      if (res.ok) {
        const data = (await res.json()) as { cursors: RemoteCursor[] };
        setCursors(data.cursors ?? []);
      }
    } catch {
      // Silently ignore — presence is best-effort
    }
  }, [engine, user, activeColor]);

  useEffect(() => {
    if (!engine || !user) {
      setCursors([]);
      return;
    }

    // Initial tick
    tick();

    intervalRef.current = setInterval(tick, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [engine, user, tick]);

  return cursors;
}
