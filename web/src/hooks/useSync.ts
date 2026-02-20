'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SyncManager } from '@/core/sync/SyncManager';
import { TileManager } from '@/core/sync/TileManager';
import type { DrawingEngine } from '@/core/engine/DrawingEngine';
import type { SyncState } from '@/core/types';
import { useUIStore } from '@/stores/uiStore';

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

  // === Init sync & tile manager ===
  useEffect(() => {
    if (!engine || !userId) return;

    // 1. Init Persistence Manager
    if (!syncRef.current) {
      const sync = new SyncManager({
        accessToken,
        userId,
        apiBaseUrl: '/api',
      });
      sync.bindEngine(engine);

      sync.onStateChange((state: SyncState) => {
        setSyncState(state);
      });

      syncRef.current = sync;
      setSyncState(sync.getState()); // Set initial state
    } else {
      syncRef.current.updateToken(accessToken);
    }

    // 2. Init Tile Manager
    if (!tileManagerRef.current) {
      tileManagerRef.current = new TileManager({
        apiBaseUrl: '/api',
      });
    }

    return () => {
      // We don't necessarily dispose SyncManager on re-renders unless unmounting
      // But for strict correctness:
      // In React Strict Mode this might run twice.
      // Usually we want to keep one instance if dependencies match.
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
  const joinRoom = useCallback((lat: number, lng: number) => {
    // No-op in tile-based sync
  }, []);

  // === Load strokes for viewport using TileManager ===
  const loadViewport = useCallback(
    async (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }, zoom: number) => {
      if (!tileManagerRef.current || !engine) return [];

      const strokes = await tileManagerRef.current.fetchMissingTiles(bounds);

      if (strokes.length > 0) {
        engine.addExternalStroke
        // Use bulk load or addExternalStroke? 
        // addExternalStroke triggers render per stroke which is slow.
        // DrawingEngine should support bulk load better.
        // Let's use loadStrokes which calls bulkLoad.
        engine.loadStrokes(strokes);
      }
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
