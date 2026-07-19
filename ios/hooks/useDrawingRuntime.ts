import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { MAX_INK, MAX_UNDO_STACK } from '@niubi/shared';
import { HistoryManager, InkManager, TileRenderer } from '@/core';

/** Lifecycle owner for the mutable drawing engine objects. */
export function useDrawingRuntime() {
  const inkManagerRef = useRef<InkManager | null>(null);
  const historyRef = useRef<HistoryManager | null>(null);
  const tileRendererRef = useRef(new TileRenderer());
  const [ink, setInk] = useState(MAX_INK);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const previousInkRef = useRef(MAX_INK);

  useEffect(() => {
    if (previousInkRef.current > 0 && ink <= 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    previousInkRef.current = ink;
  }, [ink]);

  useEffect(() => {
    const inkManager = new InkManager(setInk);
    const tileRenderer = tileRendererRef.current;
    inkManagerRef.current = inkManager;
    historyRef.current = new HistoryManager(MAX_UNDO_STACK, (undo, redo) => {
      setCanUndo(undo);
      setCanRedo(redo);
    });

    return () => {
      inkManager.dispose();
      tileRenderer.clear();
      if (inkManagerRef.current === inkManager) inkManagerRef.current = null;
      historyRef.current = null;
    };
  }, []);

  return {
    inkManagerRef,
    historyRef,
    tileRendererRef,
    ink,
    canUndo,
    canRedo,
  };
}
