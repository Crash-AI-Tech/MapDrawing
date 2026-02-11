'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { DrawingEngine } from '@/core/engine/DrawingEngine';
import type { GeoBounds, ViewState } from '@/core/types';
import { VIEWPORT_LOAD_DEBOUNCE } from '@/constants';

export interface UseViewportOptions {
  engine: DrawingEngine | null;
  /** Called when viewport moves (debounced) */
  onViewportChange?: (bounds: GeoBounds, zoom: number) => void;
}

/**
 * useViewport — provides reactive viewport state and debounced change callbacks.
 */
export function useViewport({ engine, onViewportChange }: UseViewportOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onViewportChange);

  // Always keep latest callback ref
  callbackRef.current = onViewportChange;

  useEffect(() => {
    if (!engine) return;

    const unsub = engine.subscribe((event) => {
      if (event.type === 'viewport:change') {
        // Debounce viewport change callback
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          const bounds = engine.viewport.getBounds();
          const zoom = engine.viewport.zoom;
          callbackRef.current?.(bounds, zoom);
        }, VIEWPORT_LOAD_DEBOUNCE);
      }
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [engine]);

  const getBounds = useCallback((): GeoBounds | null => {
    return engine?.viewport.getBounds() ?? null;
  }, [engine]);

  const getViewState = useCallback((): ViewState | null => {
    return engine?.viewport.getViewState() ?? null;
  }, [engine]);

  const getZoom = useCallback((): number => {
    return engine?.viewport.zoom ?? 0;
  }, [engine]);

  return {
    getBounds,
    getViewState,
    getZoom,
  };
}
