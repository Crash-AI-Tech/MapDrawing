'use client';

import { useRef, useEffect, useCallback } from 'react';
import {
  DrawingEngine,
  type DrawingEngineConfig,
  type EngineEvent,
} from '@/core/engine/DrawingEngine';
import { RenderPipeline } from '@/core/renderer/RenderPipeline';
import { InputManager } from '@/core/input/InputManager';
import { WebCanvasProvider } from '@/platform/web/WebCanvasProvider';
import { MapLibreAdapter } from '@/platform/web/MapLibreAdapter';
import { useDrawingStore } from '@/stores/drawingStore';
import { useInkStore } from '@/stores/inkStore';
import { MIN_DRAW_ZOOM } from '@/constants';
import type { Map as MaplibreMap } from 'maplibre-gl';

export interface UseDrawingEngineOptions {
  userId: string;
  userName: string;
}

export interface UseDrawingEngineReturn {
  engineRef: React.RefObject<DrawingEngine | null>;
  pipelineRef: React.RefObject<RenderPipeline | null>;
  inputRef: React.RefObject<InputManager | null>;
  canvasProviderRef: React.RefObject<WebCanvasProvider | null>;
  /** Call once MapLibre map is ready */
  initWithMap: (map: MaplibreMap, container: HTMLElement) => void;
  /** Clean up engine resources */
  destroy: () => void;
}

/**
 * useDrawingEngine — initializes and manages the entire drawing pipeline.
 * Bridges the pure-TS engine with React state (Zustand stores).
 */
export function useDrawingEngine(
  options: UseDrawingEngineOptions
): UseDrawingEngineReturn {
  const engineRef = useRef<DrawingEngine | null>(null);
  const pipelineRef = useRef<RenderPipeline | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const canvasProviderRef = useRef<WebCanvasProvider | null>(null);
  const adapterRef = useRef<MapLibreAdapter | null>(null);

  const drawingStore = useDrawingStore;
  const inkStore = useInkStore;

  // === Init engine + pipeline when map is ready ===
  const initWithMap = useCallback(
    (map: MaplibreMap, container: HTMLElement) => {
      // Prevent double init
      if (engineRef.current) return;

      // 1) Create engine
      const engine = new DrawingEngine({
        userId: options.userId,
        userName: options.userName,
      });
      engineRef.current = engine;

      // 2) Create MapLibre adapter + wire viewport
      const adapter = new MapLibreAdapter(map);
      adapterRef.current = adapter;
      engine.viewport.setConverter(adapter);
      engine.viewport.update(adapter.getViewState());

      // 3) Create canvas overlay
      const canvasProvider = new WebCanvasProvider();
      canvasProviderRef.current = canvasProvider;
      const { compositeCanvas, activeCanvas } = canvasProvider.init(container);

      // 4) Create render pipeline
      const pipeline = new RenderPipeline({
        brushRegistry: engine.brushes,
        viewportManager: engine.viewport,
        strokeManager: engine.strokes,
      });
      pipelineRef.current = pipeline;
      pipeline.init(compositeCanvas, activeCanvas, container);

      // 5) Give engine the active canvas context
      const activeCtx = pipeline.getActiveContext();
      if (activeCtx) {
        engine.setActiveCanvas(activeCtx);
      }

      // 6) Create input manager — wired directly to engine
      const input = new InputManager({
        target: activeCanvas,
        engine,
        onUndoGesture: () => engine.undo(),
      });
      inputRef.current = input;

      // 7) Wire engine events → Zustand store + pipeline
      engine.subscribe((event: EngineEvent) => {
        switch (event.type) {
          case 'render:request':
            pipeline.requestRender();
            break;
          case 'history:change':
            drawingStore.getState().setCanUndo(event.canUndo);
            drawingStore.getState().setCanRedo(event.canRedo);
            break;
          case 'stroke:start':
            drawingStore.getState().setIsDrawing(true);
            break;
          case 'stroke:end':
            drawingStore.getState().setIsDrawing(false);
            drawingStore
              .getState()
              .setStrokeCount(engine.strokes.count);
            break;
          case 'stroke:added':
          case 'stroke:deleted':
            drawingStore
              .getState()
              .setStrokeCount(engine.strokes.count);
            break;
          case 'ink:empty':
            inkStore.getState().setShowLowInkWarning(true);
            // Auto-dismiss after 3 seconds
            setTimeout(() => inkStore.getState().setShowLowInkWarning(false), 3000);
            break;
          case 'ink:low':
            // Just update store — UI will show warning styling
            break;
        }
      });

      // 7b) Wire InkManager → inkStore
      const inkUnsub = engine.inkManager.subscribe((ink, maxInk) => {
        inkStore.getState().setInk(ink);
        inkStore.getState().setMaxInk(maxInk);
      });
      // Set initial ink values
      inkStore.getState().setInk(engine.inkManager.getInk());
      inkStore.getState().setMaxInk(engine.inkManager.maxInk);

      // 8) Wire MapLibre move → viewport + re-render
      const onMapMove = () => {
        engine.viewport.update(adapter.getViewState());
        pipeline.requestRender();

        // Zoom-based drawing gate: auto-disable canvas input when zoomed out
        const currentZoom = adapter.getViewState().zoom;
        const storeDrawingMode = drawingStore.getState().drawingMode;
        const canDraw = storeDrawingMode && currentZoom >= MIN_DRAW_ZOOM;
        canvasProvider.setDrawingMode(canDraw);
      };
      map.on('move', onMapMove);
      map.on('resize', () => pipeline.resize());

      // 9) Sync initial drawing store state → engine
      const state = drawingStore.getState();
      engine.setBrush(state.activeBrushId);
      engine.setColor(state.activeColor);
      engine.setOpacity(state.activeOpacity);
      engine.setSize(state.activeSize);

      // 10) Register engine undo/redo in the store so Toolbar can use them
      drawingStore.getState().registerEngineActions(
        () => engine.undo(),
        () => engine.redo()
      );
    },
    [options.userId, options.userName, drawingStore]
  );

  // === Sync store changes → engine ===
  useEffect(() => {
    const unsub = useDrawingStore.subscribe((state, prevState) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (state.activeBrushId !== prevState.activeBrushId) {
        engine.setBrush(state.activeBrushId);
      }
      if (state.activeColor !== prevState.activeColor) {
        engine.setColor(state.activeColor);
      }
      if (state.activeOpacity !== prevState.activeOpacity) {
        engine.setOpacity(state.activeOpacity);
      }
      if (state.activeSize !== prevState.activeSize) {
        engine.setSize(state.activeSize);
      }
      if (state.drawingMode !== prevState.drawingMode) {
        // Combine user intent with zoom threshold
        const currentZoom = adapterRef.current?.getViewState().zoom ?? 0;
        const canDraw = state.drawingMode && currentZoom >= MIN_DRAW_ZOOM;
        canvasProviderRef.current?.setDrawingMode(canDraw);
      }
    });
    return () => unsub();
  }, []);

  // === Cleanup on unmount ===
  const destroy = useCallback(() => {
    // Unregister engine actions from store
    useDrawingStore.getState().unregisterEngineActions();

    inputRef.current?.dispose();
    pipelineRef.current?.dispose();
    canvasProviderRef.current?.dispose();
    engineRef.current?.dispose();

    inputRef.current = null;
    pipelineRef.current = null;
    canvasProviderRef.current = null;
    engineRef.current = null;
    adapterRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return {
    engineRef,
    pipelineRef,
    inputRef,
    canvasProviderRef,
    initWithMap,
    destroy,
  };
}
