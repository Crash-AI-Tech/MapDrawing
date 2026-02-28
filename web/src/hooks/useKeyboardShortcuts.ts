'use client';

import { useEffect } from 'react';
import { useDrawingStore } from '@/stores/drawingStore';
import { useUIStore } from '@/stores/uiStore';
import { usePinStore } from '@/stores/pinStore';
import { BRUSH_IDS, MAX_BRUSH_SIZE, MIN_DRAW_ZOOM, MIN_PIN_ZOOM } from '@/constants';

/**
 * useKeyboardShortcuts — global keyboard shortcuts for the map/drawing screen.
 *
 * Shortcuts:
 *   B — toggle brush panel (switch to draw mode)
 *   E — toggle eraser
 *   H — hand (navigate) mode
 *   P — pin placement mode
 *   [ / ] — decrease / increase brush size
 *   Esc — exit current mode / close panels
 *
 * Undo/Redo (Ctrl/Cmd+Z) is handled by InputManager in the core layer.
 */
export function useKeyboardShortcuts() {
  const setDrawingMode = useDrawingStore((s) => s.setDrawingMode);
  const setActiveBrush = useDrawingStore((s) => s.setActiveBrush);
  const activeBrushId = useDrawingStore((s) => s.activeBrushId);
  const activeSize = useDrawingStore((s) => s.activeSize);
  const setActiveSize = useDrawingStore((s) => s.setActiveSize);
  const drawingMode = useDrawingStore((s) => s.drawingMode);
  const setPlacingPin = usePinStore((s) => s.setPlacingPin);
  const placingPin = usePinStore((s) => s.placingPin);
  const currentZoom = useUIStore((s) => s.currentZoom);
  const setBrushPanelOpen = useUIStore((s) => s.setBrushPanelOpen);
  const brushPanelOpen = useUIStore((s) => s.brushPanelOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      // Ignore when modifier keys are pressed (leave for other handlers)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'h': // Hand mode
          e.preventDefault();
          setDrawingMode(false);
          setPlacingPin(false);
          break;

        case 'b': // Toggle brush panel / enter draw mode
          e.preventDefault();
          if (currentZoom >= MIN_DRAW_ZOOM) {
            setBrushPanelOpen(!brushPanelOpen);
            if (!drawingMode) {
              setDrawingMode(true);
              setPlacingPin(false);
            }
          }
          break;

        case 'e': // Toggle eraser
          e.preventDefault();
          if (currentZoom >= MIN_DRAW_ZOOM) {
            if (!drawingMode) {
              setDrawingMode(true);
              setPlacingPin(false);
            }
            setActiveBrush(
              activeBrushId === BRUSH_IDS.ERASER ? BRUSH_IDS.PENCIL : BRUSH_IDS.ERASER
            );
          }
          break;

        case 'p': // Pin mode
          e.preventDefault();
          if (currentZoom >= MIN_PIN_ZOOM) {
            setDrawingMode(false);
            setPlacingPin(!placingPin);
          }
          break;

        case '[': // Decrease brush size
          e.preventDefault();
          setActiveSize(Math.max(0.5, activeSize - 0.5));
          break;

        case ']': // Increase brush size
          e.preventDefault();
          setActiveSize(Math.min(MAX_BRUSH_SIZE, activeSize + 0.5));
          break;

        case 'escape': // Exit current mode / close panels
          e.preventDefault();
          if (brushPanelOpen) {
            setBrushPanelOpen(false);
          } else if (placingPin) {
            setPlacingPin(false);
          } else if (drawingMode) {
            setDrawingMode(false);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeBrushId, activeSize, drawingMode, placingPin, currentZoom, brushPanelOpen,
    setDrawingMode, setActiveBrush, setActiveSize, setPlacingPin, setBrushPanelOpen,
  ]);
}
