'use client';

import { useCallback } from 'react';
import { useDrawingStore } from '@/stores/drawingStore';
import { useUIStore } from '@/stores/uiStore';
import { BRUSH_IDS, COLOR_PRESETS, DEFAULT_COLOR, DEFAULT_SIZE, DEFAULT_OPACITY } from '@/constants';

/**
 * useToolbar — bridges toolbar UI interactions with Zustand store.
 * Provides convenient actions for brush/color/size selection.
 */
export function useToolbar() {
  const {
    activeBrushId,
    activeColor,
    activeOpacity,
    activeSize,
    drawingMode,
    canUndo,
    canRedo,
    setActiveBrush,
    setActiveColor,
    setActiveOpacity,
    setActiveSize,
    setDrawingMode,
    undo: storeUndo,
    redo: storeRedo,
  } = useDrawingStore();

  const currentZoom = useUIStore((state) => state.currentZoom);

  const selectBrush = useCallback(
    (brushId: string) => {
      setActiveBrush(brushId);
      if (!drawingMode) setDrawingMode(true);
    },
    [setActiveBrush, drawingMode, setDrawingMode]
  );

  const selectColor = useCallback(
    (color: string) => {
      setActiveColor(color);
    },
    [setActiveColor]
  );

  const changeSize = useCallback(
    (size: number) => {
      setActiveSize(Math.max(0.5, Math.min(20, size)));
    },
    [setActiveSize]
  );

  const changeOpacity = useCallback(
    (opacity: number) => {
      setActiveOpacity(Math.max(0, Math.min(1, opacity)));
    },
    [setActiveOpacity]
  );

  const toggleDrawingMode = useCallback(() => {
    setDrawingMode(!drawingMode);
  }, [drawingMode, setDrawingMode]);

  const undo = useCallback(() => {
    storeUndo();
  }, [storeUndo]);

  const redo = useCallback(() => {
    storeRedo();
  }, [storeRedo]);

  const resetDefaults = useCallback(() => {
    setActiveBrush(BRUSH_IDS.PENCIL);
    setActiveColor(DEFAULT_COLOR);
    setActiveSize(DEFAULT_SIZE);
    setActiveOpacity(DEFAULT_OPACITY);
  }, [setActiveBrush, setActiveColor, setActiveSize, setActiveOpacity]);

  return {
    // State
    activeBrushId,
    activeColor,
    activeOpacity,
    activeSize,
    drawingMode,
    canUndo,
    canRedo,
    currentZoom,
    colorPresets: COLOR_PRESETS,

    // Actions
    selectBrush,
    selectColor,
    changeSize,
    changeOpacity,
    toggleDrawingMode,
    undo,
    redo,
    resetDefaults,
  };
}
