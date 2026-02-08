'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SyncManager, type SyncManagerConfig } from '@/core/sync/SyncManager';
import type { DrawingEngine } from '@/core/engine/DrawingEngine';
import type { SyncState } from '@/core/types';
import { useUIStore } from '@/stores/uiStore';
import { DO_WEBSOCKET_URL } from '@/constants';

export interface UseSyncOptions {
  engine: DrawingEngine | null;
  userId: string;
  accessToken: string;
}

/**
 * useSync — manages SyncManager lifecycle + connection state.
 */
export function useSync({ engine, userId, accessToken }: UseSyncOptions) {
  const syncRef = useRef<SyncManager | null>(null);
  const setSyncState = useUIStore((s) => s.setSyncState);

  // === Init sync when engine + token ready ===
  useEffect(() => {
    if (!engine || !userId) return;

    // Don't re-create if already exists with same config
    if (syncRef.current) {
      syncRef.current.updateToken(accessToken);
      return;
    }

    const sync = new SyncManager({
      doBaseUrl: DO_WEBSOCKET_URL,
      accessToken,
      userId,
      apiBaseUrl: '/api',
    });

    sync.bindEngine(engine);

    const unsub = sync.onStateChange((state: SyncState) => {
      setSyncState(state);
    });

    syncRef.current = sync;

    return () => {
      unsub();
      sync.dispose();
      syncRef.current = null;
    };
  }, [engine, userId, accessToken, setSyncState]);

  // === Join room by lat/lng ===
  const joinRoom = useCallback((lat: number, lng: number) => {
    syncRef.current?.joinRoom(lat, lng);
  }, []);

  // === Load strokes for viewport ===
  const loadViewport = useCallback(
    async (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }, zoom: number) => {
      const strokes = await syncRef.current?.loadViewport(bounds, zoom);
      if (strokes && strokes.length > 0 && engine) {
        engine.loadStrokes(strokes);
      }
      return strokes ?? [];
    },
    [engine]
  );

  return {
    syncRef,
    joinRoom,
    loadViewport,
  };
}
