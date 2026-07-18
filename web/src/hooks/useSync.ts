'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SyncManager } from '@/core/sync/SyncManager';
import { TileManager } from '@/core/sync/TileManager';
import type { DrawingEngine } from '@/core/engine/DrawingEngine';
import type { SyncState } from '@/core/types';
import { useUIStore } from '@/stores/uiStore';

import { MIN_DATA_ZOOM } from '@/constants';
import { Compliance } from '@/lib/compliance';

const MAX_CACHED_STROKES = 5000;

export interface UseSyncOptions {
  engine: DrawingEngine | null;
  userId: string;
  accessToken: string;
}

/**
 * useSync — manages persistence (SyncManager) and data fetching (TileManager).
 */
export function useSync({ engine, userId, accessToken }: UseSyncOptions) {
  const syncRef = useRef<SyncManager | null>(null);
  const tileManagerRef = useRef<TileManager | null>(null);
  const setSyncState = useUIStore((s) => s.setSyncState);

  // Public drawing tiles are available to guests.
  useEffect(() => {
    if (!tileManagerRef.current) {
      tileManagerRef.current = new TileManager({
        apiBaseUrl: '/api',
      });
    }
  }, []);

  // Persistence must be rebound when the authenticated identity changes.
  useEffect(() => {
    syncRef.current?.dispose();
    syncRef.current = null;
    if (!engine || !accessToken || userId === 'anonymous') {
      setSyncState('connected');
      return;
    }

    const sync = new SyncManager({
      accessToken,
      userId,
      apiBaseUrl: '/api',
    });
    sync.bindEngine(engine);
    sync.onStateChange((state: SyncState) => setSyncState(state));
    syncRef.current = sync;
    setSyncState(sync.getState());
    void fetch('/api/ink')
      .then(async (response): Promise<{ ink?: number } | null> =>
        response.ok ? response.json() as Promise<{ ink?: number }> : null
      )
      .then((data) => {
        if (typeof data?.ink === 'number') engine.inkManager.reconcile(data.ink);
      })
      .catch(() => undefined);

    return () => {
      if (syncRef.current === sync) syncRef.current = null;
      sync.dispose();
    };
  }, [engine, userId, accessToken, setSyncState]);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      syncRef.current?.dispose();
      syncRef.current = null;
      tileManagerRef.current = null;
    };
  }, []);

  // === Join room (Deprecated - kept for API compatibility if needed, but does nothing now) ===
  const joinRoom = useCallback((_lat: number, _lng: number) => {
    // No-op in tile-based sync
  }, []);

  // === Load strokes for viewport using TileManager ===
  const loadViewport = useCallback(
    async (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }, zoom: number) => {
      // Safety guard: never load data when zoomed out too far
      if (zoom < MIN_DATA_ZOOM) return [];
      if (!tileManagerRef.current || !engine) return [];

      const blockedUserIds = new Set(Compliance.getBlockedUsers());
      const strokes = (await tileManagerRef.current.fetchMissingTiles(bounds))
        .filter((stroke) => !blockedUserIds.has(stroke.userId));

      if (strokes.length > 0) {
        engine.loadStrokes(strokes);
      }
      engine.pruneLoadedStrokes(bounds, MAX_CACHED_STROKES, blockedUserIds);
      return strokes;
    },
    [engine]
  );

  return {
    syncRef,
    joinRoom,
    loadViewport,
  };
}
