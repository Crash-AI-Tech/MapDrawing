/**
 * MapScreen — Core map + drawing screen (v2 — Tile-based Rendering).
 *
 * Architecture:
 * - MapLibre GL Native (full-screen map)
 * - Skia Canvas overlay with TileRenderer (bitmap-cached spatial tiles)
 * - Geo-coordinate storage (screen → geo on endStroke, geo → screen on render)
 * - Zoom-dependent stroke visibility and scaling
 * - InkManager + HistoryManager for game mechanics
 * - Pins via MapLibre ShapeSource (GPU vector layer, not N×PointAnnotation)
 *
 * Performance over v1:
 * - Spatial tile cache: only dirty tiles re-render, not all O(N) strokes
 * - Incremental stroke cache: SkPath computed once per stroke
 * - Paint reuse: no per-frame Paint construction
 * - Strokes in ref (not state): no React reconciliation for large arrays
 */

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  Alert,
  TouchableOpacity,
  AppState,
  Share,
  Image,
  type LayoutChangeEvent,
} from 'react-native';
import MapLibreGL, { type CameraRef } from '@maplibre/maplibre-react-native';
import {
  Canvas,
  Path,
  Group,
  Skia,
  Picture,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DrawingToolbar from '@/components/DrawingToolbar';
import ZoomControls from '@/components/ZoomControls';
import PinPlacer from '@/components/PinPlacer';
import MapPinOverlay, { MapPinTooltip, type PinData } from '@/components/MapPinOverlay';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CreationGuide from '@/components/CreationGuide';
import { trackEvent } from '@/lib/analytics';
import {
  fetchPins,
  fetchInk,
  createPin,
  fetchBlockedUsers,
  type MapPin,
  type PinCluster,
  type PinItem,
} from '@/lib/api';
import { Compliance } from '@/utils/compliance';
import { API_BASE_URL, MAP_STYLE_URL } from '@/lib/config';
import { SyncManager } from '@/core/sync/SyncManager';
import { TileManager } from '@/core/sync/TileManager';
import {
  BRUSH_IDS,
  type BrushId,
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  DEFAULT_OPACITY,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  journeyText, parseMapLocation, mapLocationQuery, type SyncState,
  MIN_DRAW_ZOOM,
  MIN_PIN_ZOOM,
  MIN_DATA_ZOOM,
  PIN_INK_COST,
  STROKE_HIDE_ZOOM_DIFF,
} from '@niubi/shared';
import {
  MercatorProjection,
  generateId,
  BASE_ZOOM,
} from '@/core';
import type { StrokeData, StrokePoint, CameraState } from '@/core/types';
import { useLang, ts, tf, getCurrentLang } from '@/lib/i18n';
import ViewShot from 'react-native-view-shot';
import { showExportMenu } from '@/utils/exportMap';
import { registerMapExportAction } from '@/utils/mapExportAction';
import { usePresence } from '@/hooks/usePresence';
import { CursorOverlay } from '@/components/CursorOverlay';
import { getActiveBrushConfig } from '@/core/activeBrush';
import { useDrawingRuntime } from '@/hooks/useDrawingRuntime';
import { useMapSession } from '@/hooks/useMapSession';

// ========================
// MapLibre Configuration
// ========================

MapLibreGL.setAccessToken(null);

// ========================
// Pagination & Interaction Constants
// ========================

const DRAWINGS_MAX_CACHE = 2500;
const PINS_PAGE_SIZE = 120;
const PINS_MAX_PAGES = 4;
const PINS_MAX_CACHE = 600;
const CAMERA_UPDATE_THROTTLE_MS = 16;
const INTERACTION_SETTLE_MS = 120;
const MIN_PINS_FETCH_ZOOM = 8; // Don't fetch pins when zoomed out below this
const MIN_POINT_DISTANCE_PX = 1;
const MAX_POINTS_PER_STROKE = 1000;

// ========================
// Main Component
// ========================

export default function MapScreen() {
  const routeParams = useLocalSearchParams<{ lng?: string; lat?: string; zoom?: string }>();
  const linkedLocation = parseMapLocation({ get: key => {
    const value = (routeParams as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
  } });
  const { session, avatarVersion } = useMapSession();
  const {
    inkManagerRef,
    historyRef,
    tileRendererRef,
    ink,
    canUndo,
    canRedo,
  } = useDrawingRuntime();

  // ===== Layout =====
  const [screenSize, setScreenSize] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  // ===== Camera State =====
  const [cameraState, setCameraState] = useState<CameraState>({
    center: linkedLocation ? [linkedLocation.lng, linkedLocation.lat] : MAP_DEFAULT_CENTER as [number, number],
    zoom: linkedLocation?.zoom ?? MAP_DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  });

  // ===== Projection =====
  const projectionRef = useRef(new MercatorProjection());
  projectionRef.current.update(
    cameraState.center,
    cameraState.zoom,
    screenSize.width,
    screenSize.height,
    cameraState.bearing
  );

  // ===== Engine Managers =====
  const cameraRef = useRef<CameraRef | null>(null);
  const viewShotRef = useRef<ViewShot | null>(null);

  useEffect(
    () => registerMapExportAction(() => showExportMenu(viewShotRef, getCurrentLang())),
    [],
  );

  // ===== Reactive State =====
  const [mode, setMode] = useState<'hand' | 'draw' | 'pin'>('hand');
  const [saveState, setSaveState] = useState<SyncState>('connected');
  const [contentLimited, setContentLimited] = useState(false);
  const [strokesTransparent, setStrokesTransparent] = useState(false);

  // ===== Real-time Collaboration =====
  const syncManagerRef = useRef<SyncManager | null>(null);
  const tileManagerRef = useRef<TileManager | null>(null);

  // ===== Strokes: ref-based (no React state for big arrays) =====
  const strokesRef = useRef<Map<string, StrokeData>>(new Map());
  const [strokeVersion, setStrokeVersion] = useState(0);
  const bumpStrokeVersion = useCallback(() => setStrokeVersion((v) => v + 1), []);

  // 2a. Init TileManager unconditionally (drawings API is public, no auth needed)
  useEffect(() => {
    tileManagerRef.current = new TileManager({});
    return () => tileManagerRef.current?.cancelInFlight();
  }, []);

  // 2b. Init SyncManager (requires session)
  useEffect(() => {
    if (!session) return;

    const syncManager = new SyncManager({
      userId: session.userId,
      token: session.token,
      onInkBalance: (serverInk) => inkManagerRef.current?.reconcile(serverInk),
      onStrokeRejected: (strokeId) => {
        strokesRef.current.delete(strokeId);
        tileRendererRef.current.removeStroke(strokeId);
        loadedStrokeIdsRef.current.delete(strokeId);
        bumpStrokeVersion();
      },
    });
    syncManagerRef.current = syncManager;
    const stopState = syncManager.onStateChange(setSaveState);
    fetchInk()
      .then(({ ink: serverInk }) => inkManagerRef.current?.reconcile(serverInk))
      .catch(() => undefined);
    fetchBlockedUsers()
      .then(({ items }) => Compliance.setBlockedUsers(items.map((item) => item.userId)))
      .catch(() => undefined);

    return () => {
      stopState();
      syncManager.dispose();
      if (syncManagerRef.current === syncManager) syncManagerRef.current = null;
    };
  }, [session, bumpStrokeVersion, inkManagerRef, tileRendererRef]);


  // ===== Pin State (flat arrays for MapPinOverlay) =====
  const [visiblePins, setVisiblePins] = useState<PinData[]>([]);
  const pinCacheRef = useRef<Map<string, MapPin>>(new Map());
  const pinLruRef = useRef<Map<string, number>>(new Map());

  const [pinClickCoords, setPinClickCoords] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const router = useRouter();
  const [lang] = useLang();

  // Guarded mode setter: prompt login for draw/pin if not authenticated
  const handleModeChange = useCallback((newMode: 'hand' | 'draw' | 'pin') => {
    if (newMode !== 'hand') trackEvent('tool_try');
    if (newMode === 'pin' && !session) {
      Alert.alert(
        ts('signInRequired', lang),
        ts('signInToDrawOrPin', lang),
        [
          { text: ts('cancel', lang), style: 'cancel' },
          { text: ts('signIn', lang), onPress: () => router.push('/login') },
        ]
      );
      return;
    }
    if (newMode !== 'hand') cameraRef.current?.setCamera({ zoomLevel: Math.max(cameraZoomRef.current, newMode === 'draw' ? MIN_DRAW_ZOOM : MIN_PIN_ZOOM), animationDuration: 600 });
    setMode(newMode);
  }, [session, router, lang]);

  // ===== Remote Data Loading =====
  const loadedStrokeIdsRef = useRef<Set<string>>(new Set());
  const strokeLruRef = useRef<Map<string, number>>(new Map());
  const lruTickRef = useRef(0);
  const viewportLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportControllerRef = useRef<AbortController | null>(null);

  // ===== Map Interaction State =====
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const isMapInteractingRef = useRef(false);
  const interactionEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCameraUpdateAtRef = useRef(0);

  // ===== Stable Snapshot for Interaction =====
  const [stableSnapshot, setStableSnapshot] = useState<SkPicture | null>(null);
  const stableSnapshotCameraRef = useRef<CameraState | null>(null);

  // ===== Tool State =====
  const [currentBrush, setCurrentBrush] = useState<BrushId>(BRUSH_IDS.PENCIL);
  const [currentColor, setCurrentColor] = useState<string>(DEFAULT_COLOR);
  const [currentSize, setCurrentSize] = useState<number>(DEFAULT_SIZE);
  const [currentOpacity, setCurrentOpacity] = useState<number>(DEFAULT_OPACITY);

  // ===== Presence (remote cursors) =====
  const remoteCursors = usePresence({
    lat: cameraState.center[1],
    lng: cameraState.center[0],
    color: currentColor,
    isAuthenticated: !!session,
  });

  // ===== Active Drawing State =====
  const currentPointsRef = useRef<
    { x: number; y: number; pressure: number; timestamp: number }[]
  >([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const currentPathRef = useRef<SkPath | null>(null);
  const inkAccumulatorRef = useRef(0);

  // ===== Refs for Gesture Callbacks =====
  const currentBrushRef = useRef(currentBrush);
  const currentColorRef = useRef(currentColor);
  const currentSizeRef = useRef(currentSize);
  const currentOpacityRef = useRef(currentOpacity);
  const cameraZoomRef = useRef(cameraState.zoom);
  const canDrawRef = useRef(false);

  currentBrushRef.current = currentBrush;
  currentColorRef.current = currentColor;
  currentSizeRef.current = currentSize;
  currentOpacityRef.current = currentOpacity;
  cameraZoomRef.current = cameraState.zoom;
  canDrawRef.current = mode === 'draw' && cameraState.zoom >= MIN_DRAW_ZOOM;

  // ===== Viewport loading: paginated fetch + TileRenderer update =====
  const loadViewport = useCallback(async () => {
    viewportControllerRef.current?.abort();
    const controller = new AbortController();
    viewportControllerRef.current = controller;
    // Skip ALL data loading when zoomed out too far to prevent performance issues
    const zoom = cameraZoomRef.current;
    if (zoom < MIN_DATA_ZOOM) {
      return;
    }

    // Cancel any in-flight tile fetches from a previous call
    // (TileManager.fetchMissingTiles already calls cancelInFlight internally)

    const proj = projectionRef.current;
    const bounds = proj.getViewportBounds();

    const expandedBounds = {
      minLng: bounds.minLng - (bounds.maxLng - bounds.minLng) * 0.5,
      maxLng: bounds.maxLng + (bounds.maxLng - bounds.minLng) * 0.5,
      minLat: bounds.minLat - (bounds.maxLat - bounds.minLat) * 0.5,
      maxLat: bounds.maxLat + (bounds.maxLat - bounds.minLat) * 0.5,
    };

    const overlapsBounds = (
      itemBounds: { minLng: number; maxLng: number; minLat: number; maxLat: number },
      queryBounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }
    ) => !(
      itemBounds.maxLng < queryBounds.minLng ||
      itemBounds.minLng > queryBounds.maxLng ||
      itemBounds.maxLat < queryBounds.minLat ||
      itemBounds.minLat > queryBounds.maxLat
    );

    const touchStroke = (id: string) => {
      lruTickRef.current += 1;
      strokeLruRef.current.set(id, lruTickRef.current);
    };
    const touchPin = (id: string) => {
      lruTickRef.current += 1;
      pinLruRef.current.set(id, lruTickRef.current);
    };

    try {
      let newStrokesAdded = false;
      // --- Load Strokes (Tile-based) ---
      // Only fetch tiles when zoomed in enough for drawings to be visible.
      // TileManager uses zoom 14; drawings hide below zoom (14 - STROKE_HIDE_ZOOM_DIFF).
      const MIN_DRAWINGS_ZOOM = 14 - STROKE_HIDE_ZOOM_DIFF;
      if (tileManagerRef.current && zoom >= MIN_DRAWINGS_ZOOM) {
        const newStrokes = await tileManagerRef.current.fetchMissingTiles({
          minLat: bounds.minLat, maxLat: bounds.maxLat,
          minLng: bounds.minLng, maxLng: bounds.maxLng
        });
        if (controller.signal.aborted) return;
        setContentLimited(tileManagerRef.current.truncated);
        for (const id of tileManagerRef.current.takeRemovedIds()) {
          if (syncManagerRef.current?.isPending(id)) continue;
          strokesRef.current.delete(id);
          tileRendererRef.current.removeStroke(id);
          loadedStrokeIdsRef.current.delete(id);
          newStrokesAdded = true;
        }

        if (newStrokes.length > 0) {
          console.log(`[loadViewport] Got ${newStrokes.length} new strokes (total: ${strokesRef.current.size + newStrokes.length})`);
          for (const stroke of newStrokes) {
            if (syncManagerRef.current?.isPending(stroke.id)) continue;
            if (Compliance.isBlocked(stroke.userId)) continue;
            if (!strokesRef.current.has(stroke.id)) newStrokesAdded = true;
            strokesRef.current.set(stroke.id, stroke);
            loadedStrokeIdsRef.current.add(stroke.id);
            touchStroke(stroke.id);
            tileRendererRef.current.addStroke(stroke);
          }
        }
      }

      // LRU Eviction
      if (strokesRef.current.size > DRAWINGS_MAX_CACHE) {
        const candidates = Array.from(strokeLruRef.current.entries())
          .sort((a, b) => a[1] - b[1]);
        for (const [strokeId] of candidates) {
          if (strokesRef.current.size <= DRAWINGS_MAX_CACHE) break;
          const stroke = strokesRef.current.get(strokeId);
          if (!stroke) continue;
          if (overlapsBounds(stroke.bounds, expandedBounds)) continue;
          strokesRef.current.delete(strokeId);
          strokeLruRef.current.delete(strokeId);
          loadedStrokeIdsRef.current.delete(strokeId);
          tileRendererRef.current.removeStroke(strokeId);
        }
      }

      // Remove content blocked since the previous viewport load.
      for (const [strokeId, stroke] of strokesRef.current) {
        if (!Compliance.isBlocked(stroke.userId)) continue;
        strokesRef.current.delete(strokeId);
        strokeLruRef.current.delete(strokeId);
        loadedStrokeIdsRef.current.delete(strokeId);
        tileRendererRef.current.removeStroke(strokeId);
      }
      if (newStrokesAdded) bumpStrokeVersion();


      // --- Load Pins (paginated/clustered) ---
      // 方案 B: Skip pin fetching when zoomed out too far
      if (zoom >= MIN_PINS_FETCH_ZOOM) {
        const pinFirstPage = await fetchPins({
          signal: controller.signal,
          minLat: bounds.minLat, maxLat: bounds.maxLat,
          minLng: bounds.minLng, maxLng: bounds.maxLng,
          zoom, limit: PINS_PAGE_SIZE,
        });

        if (controller.signal.aborted) return;
        if (pinFirstPage.mode === 'clustered') {
          // At low zoom, clustered pins — show cluster markers as pins
          const clusters = pinFirstPage.items.filter(
            (item): item is PinCluster => item.type === 'cluster'
          );
          setVisiblePins(
            clusters.map((c) => ({
              id: c.id,
              userId: '',
              userName: '',
              lng: c.lng,
              lat: c.lat,
              message: tf('pinsCount', lang)(c.count),
              color: '#1d4ed8',
              createdAt: 0,
            }))
          );
        } else {
          let pinCursor = pinFirstPage.nextCursor;
          let pinPageCount = 1;
          const rawPins: PinItem[] = pinFirstPage.items.filter(
            (item): item is PinItem => item.type === 'pin'
          );
          while (pinCursor && pinPageCount < PINS_MAX_PAGES) {
            const nextPage = await fetchPins({
              signal: controller.signal,
              minLat: bounds.minLat, maxLat: bounds.maxLat,
              minLng: bounds.minLng, maxLng: bounds.maxLng,
              zoom, limit: PINS_PAGE_SIZE, cursor: pinCursor,
            });
            if (controller.signal.aborted) return;
            rawPins.push(
              ...nextPage.items.filter((i): i is PinItem => i.type === 'pin')
            );
            pinCursor = nextPage.nextCursor;
            pinPageCount += 1;
          }

          // Display the current snapshot, not old cache entries deleted remotely.
          pinCacheRef.current.clear();
          rawPins.filter((pin) => !Compliance.isBlocked(pin.userId)).forEach((pin) => {
            pinCacheRef.current.set(pin.id, pin);
            touchPin(pin.id);
          });

          const filteredPins = Array.from(pinCacheRef.current.values()).filter(
            (pin) =>
              pin.lng >= expandedBounds.minLng && pin.lng <= expandedBounds.maxLng &&
              pin.lat >= expandedBounds.minLat && pin.lat <= expandedBounds.maxLat
          );

          setVisiblePins(
            filteredPins.map((pin) => ({
              id: pin.id,
              userId: pin.userId,
              userName: pin.userName ?? '',
              lng: pin.lng,
              lat: pin.lat,
              message: pin.message ?? '',
              color: pin.color ?? '#E63946',
              createdAt: pin.createdAt,
            }))
          );

          // Pin LRU Eviction
          if (pinCacheRef.current.size > PINS_MAX_CACHE) {
            const pinCandidates = Array.from(pinLruRef.current.entries())
              .sort((a, b) => a[1] - b[1]);
            for (const [pinId] of pinCandidates) {
              if (pinCacheRef.current.size <= PINS_MAX_CACHE) break;
              const pin = pinCacheRef.current.get(pinId);
              if (!pin) continue;
              if (
                pin.lng >= expandedBounds.minLng && pin.lng <= expandedBounds.maxLng &&
                pin.lat >= expandedBounds.minLat && pin.lat <= expandedBounds.maxLat
              ) continue;
              pinCacheRef.current.delete(pinId);
              pinLruRef.current.delete(pinId);
            }
          }
        }
      } // end MIN_PINS_FETCH_ZOOM guard
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('[loadViewport] Failed:', e);
      }
    }
  }, [bumpStrokeVersion, lang, tileRendererRef]);

  // Initial load
  useEffect(() => {
    trackEvent('canvas_open');
    const timer = setTimeout(loadViewport, 500);
    const refresh = setInterval(() => {
      if (AppState.currentState === 'active' && !isMapInteractingRef.current && !currentPointsRef.current.length) void loadViewport();
    }, 30_000);
    const resume = AppState.addEventListener('change', state => { if (state === 'active') void loadViewport(); });
    return () => { clearTimeout(timer); clearInterval(refresh); resume.remove(); viewportControllerRef.current?.abort(); };
  }, [loadViewport]);

  // Re-trigger viewport load when session becomes available
  // (the initial 500ms load may fire before auth completes)
  useEffect(() => {
    if (session && tileManagerRef.current) {
      trackEvent('canvas_open', session.userId);
      loadViewport();
    }
  }, [session, loadViewport]);

  // ===== Tile-based Picture (idle: composed from cached tile images) =====
  const tilePicture = useMemo(() => {
    if (isMapInteracting) return null;
    void strokeVersion; // dependency to re-render on stroke changes

    // Sync transparency flag synchronously before rendering
    // (useEffect would run after render, causing a 1-frame delay / inversion)
    tileRendererRef.current.strokesTransparent = strokesTransparent;

    return tileRendererRef.current.renderFrame(
      cameraState.center,
      cameraState.zoom,
      screenSize.width,
      screenSize.height,
      cameraState.bearing
    );
  }, [isMapInteracting, strokeVersion, strokesTransparent, cameraState.center, cameraState.zoom, cameraState.bearing, screenSize, tileRendererRef]);

  // ===== Stable Snapshot for Interaction =====
  useEffect(() => {
    if (!isMapInteracting) {
      setStableSnapshot(tilePicture);
      stableSnapshotCameraRef.current = {
        center: [...cameraState.center] as [number, number],
        zoom: cameraState.zoom,
        bearing: cameraState.bearing,
        pitch: cameraState.pitch,
      };
    }
  }, [tilePicture, isMapInteracting, cameraState]);

  // ===== Interaction Transform =====
  const interactionTransform = useMemo(() => {
    const stableCamera = stableSnapshotCameraRef.current;
    if (!isMapInteracting || !stableCamera || !stableSnapshot) return null;

    const currentScale = Math.pow(2, cameraState.zoom - BASE_ZOOM);
    const stableScale = Math.pow(2, stableCamera.zoom - BASE_ZOOM);
    const zoomRatio = currentScale / Math.max(stableScale, 1e-6);

    const proj = projectionRef.current;
    const stableCenterW = proj.geoToWorld(stableCamera.center[0], stableCamera.center[1]);
    const currentCenterW = proj.geoToWorld(cameraState.center[0], cameraState.center[1]);

    const dx = (stableCenterW.x - currentCenterW.x) * currentScale;
    const dy = (stableCenterW.y - currentCenterW.y) * currentScale;

    return {
      zoomScale: zoomRatio,
      dx,
      dy,
      cx: screenSize.width / 2,
      cy: screenSize.height / 2,
    };
  }, [isMapInteracting, stableSnapshot, cameraState, screenSize]);

  useEffect(() => {
    return () => {
      if (interactionEndTimerRef.current) {
        clearTimeout(interactionEndTimerRef.current);
      }
    };
  }, []);

  // ===== Finish stroke (convert to geo + store) =====
  const finishStroke = useCallback(() => {
    const points = currentPointsRef.current;
    if (points.length < 2) {
      currentPointsRef.current = [];
      currentPathRef.current = null;
      setCurrentPath(null);
      return;
    }

    // Consume remaining fractional ink
    if (inkManagerRef.current && inkAccumulatorRef.current > 0) {
      inkManagerRef.current.forceConsume(inkAccumulatorRef.current);
    }

    // Convert screen points → geo points for storage
    const proj = projectionRef.current;
    const geoPoints: StrokePoint[] = points.map((p) => {
      const geo = proj.screenToGeo(p.x, p.y);
      return {
        x: geo.lng,
        y: geo.lat,
        pressure: p.pressure,
        timestamp: p.timestamp,
      };
    });

    // Calculate geo bounds
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;
    for (const p of geoPoints) {
      if (p.x < minLng) minLng = p.x;
      if (p.x > maxLng) maxLng = p.x;
      if (p.y < minLat) minLat = p.y;
      if (p.y > maxLat) maxLat = p.y;
    }

    const stroke: StrokeData = {
      id: generateId(),
      userId: session?.userId ?? 'anonymous',
      userName: session?.userName ?? 'Guest',
      brushId: currentBrushRef.current,
      color: currentColorRef.current,
      opacity: currentOpacityRef.current,
      size: currentSizeRef.current,
      points: geoPoints,
      bounds: { minLng, maxLng, minLat, maxLat },
      createdZoom: cameraZoomRef.current,
      createdAt: Date.now(),
    };

    // Store in ref + tile renderer (no React state for big arrays)
    strokesRef.current.set(stroke.id, stroke);
    tileRendererRef.current.addStroke(stroke);
    bumpStrokeVersion();

    historyRef.current?.push({ type: 'ADD_STROKE', stroke });

    // Broadcast & Persist (Dual Write)
    if (syncManagerRef.current) {
      syncManagerRef.current.broadcastStroke(stroke);
    }

    currentPointsRef.current = [];
    inkAccumulatorRef.current = 0;
    currentPathRef.current = null;
    setCurrentPath(null);
  }, [bumpStrokeVersion, historyRef, inkManagerRef, tileRendererRef, session]);

  // ===== Gesture handler =====
  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(1)
    .enabled(mode === 'draw')
    .onStart((g) => {
      if (!canDrawRef.current || !inkManagerRef.current?.canDraw()) return;

      currentPointsRef.current = [
        { x: g.x, y: g.y, pressure: 0.5, timestamp: Date.now() },
      ];
      inkAccumulatorRef.current = 0;

      const path = Skia.Path.Make();
      path.moveTo(g.x, g.y);
      currentPathRef.current = path;
      setCurrentPath(path.copy());
    })
    .onUpdate((g) => {
      if (!currentPointsRef.current.length) return;

      const points = currentPointsRef.current;
      const newPoint = {
        x: g.x,
        y: g.y,
        pressure: 0.5,
        timestamp: Date.now(),
      };

      const previousPoint = points[points.length - 1];
      const sampleDistance = Math.hypot(
        newPoint.x - previousPoint.x,
        newPoint.y - previousPoint.y,
      );
      if (sampleDistance < MIN_POINT_DISTANCE_PX) return;
      if (points.length >= MAX_POINTS_PER_STROKE) {
        finishStroke();
        return;
      }

      // Calculate ink cost
      if (inkManagerRef.current && points.length > 0) {
        const prev = points[points.length - 1];
        const dx = newPoint.x - prev.x;
        const dy = newPoint.y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const cost = inkManagerRef.current.calculateSegmentCost(
          currentSizeRef.current,
          distance,
          cameraZoomRef.current
        );
        inkAccumulatorRef.current += cost;

        if (inkAccumulatorRef.current >= 1) {
          const toConsume = Math.floor(inkAccumulatorRef.current);
          const remaining = inkManagerRef.current.forceConsume(toConsume);
          inkAccumulatorRef.current -= toConsume;

          if (remaining <= 0) {
            finishStroke();
            return;
          }
        }
      }

      points.push(newPoint);

      // Append one segment instead of rebuilding the full path on every move.
      const path = currentPathRef.current;
      if (path) {
        if (currentBrushRef.current === BRUSH_IDS.PENCIL && points.length > 2) {
          const previous = points[points.length - 2];
          path.quadTo(
            previous.x,
            previous.y,
            (previous.x + newPoint.x) / 2,
            (previous.y + newPoint.y) / 2,
          );
        } else {
          path.lineTo(newPoint.x, newPoint.y);
        }
        setCurrentPath(path.copy());
      }
    })
    .onEnd(() => {
      finishStroke();
    })
    .runOnJS(true);

  // ===== Undo / Redo =====
  const handleUndo = useCallback(() => {
    const cmd = historyRef.current?.undo();
    if (!cmd) return;

    if (cmd.type === 'ADD_STROKE') {
      strokesRef.current.delete(cmd.stroke.id);
      tileRendererRef.current.removeStroke(cmd.stroke.id);
      if (cmd.stroke.userId !== 'anonymous') void syncManagerRef.current?.broadcastDelete(cmd.stroke.id);
    } else if (cmd.type === 'DELETE_STROKE') {
      strokesRef.current.set(cmd.stroke.id, cmd.stroke);
      tileRendererRef.current.addStroke(cmd.stroke);
      if (cmd.stroke.userId !== 'anonymous') void syncManagerRef.current?.broadcastStroke(cmd.stroke);
    }
    bumpStrokeVersion();
  }, [bumpStrokeVersion, historyRef, tileRendererRef]);

  const handleRedo = useCallback(() => {
    const cmd = historyRef.current?.redo();
    if (!cmd) return;

    if (cmd.type === 'ADD_STROKE') {
      strokesRef.current.set(cmd.stroke.id, cmd.stroke);
      tileRendererRef.current.addStroke(cmd.stroke);
      if (cmd.stroke.userId !== 'anonymous') void syncManagerRef.current?.broadcastStroke(cmd.stroke);
    } else if (cmd.type === 'DELETE_STROKE') {
      strokesRef.current.delete(cmd.stroke.id);
      tileRendererRef.current.removeStroke(cmd.stroke.id);
      if (cmd.stroke.userId !== 'anonymous') void syncManagerRef.current?.broadcastDelete(cmd.stroke.id);
    }
    bumpStrokeVersion();
  }, [bumpStrokeVersion, historyRef, tileRendererRef]);

  // ===== Layout =====
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setScreenSize({ width, height });
  }, []);

  // ===== Zoom controls =====
  const zoomRef = useRef(cameraState.zoom);
  useEffect(() => {
    zoomRef.current = cameraState.zoom;
  }, [cameraState.zoom]);

  const handleZoomIn = useCallback(() => {
    cameraRef.current?.setCamera({
      zoomLevel: Math.min(22, zoomRef.current + 1),
      animationDuration: 200,
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    cameraRef.current?.setCamera({
      zoomLevel: Math.max(1, zoomRef.current - 1),
      animationDuration: 200,
    });
  }, []);

  const handleZoomDelta = useCallback((delta: number) => {
    const newZoom = Math.max(1, Math.min(22, zoomRef.current + delta));
    zoomRef.current = newZoom;
    cameraRef.current?.setCamera({
      zoomLevel: newZoom,
      animationDuration: 0,
    });
  }, []);

  // ===== Pin placement =====
  const handleMapPress = useCallback(
    (feature: any) => {
      if (mode !== 'pin') return;
      if (cameraState.zoom < MIN_PIN_ZOOM) {
        Alert.alert(ts('hint', lang), tf('zoomInForPin', lang)(MIN_PIN_ZOOM));
        return;
      }
      try {
        const coords = feature?.geometry?.coordinates;
        if (coords) {
          setPinClickCoords({ lng: coords[0], lat: coords[1] });
        }
      } catch {
        // Ignore
      }
    },
    [mode, cameraState.zoom, lang]
  );

  // Clear selection when touching map (if not hitting a pin)
  // Note: ShapeSource onPress handles pin hits. MapView onPress handles map hits.
  const handleMapBackgroundPress = useCallback(() => {
    if (selectedPinId) setSelectedPinId(null);
  }, [selectedPinId]);

  const handlePinPlace = useCallback(
    async (data: { message: string; color: string }) => {
      if (!pinClickCoords || !inkManagerRef.current) return;

      // Check ink
      if (!inkManagerRef.current.consume(PIN_INK_COST)) {
        Alert.alert(ts('inkInsufficient', lang), tf('pinInkCost', lang)(PIN_INK_COST));
        return;
      }

      setPinLoading(true);
      try {
        const pin = await createPin({
          lng: pinClickCoords.lng,
          lat: pinClickCoords.lat,
          message: data.message,
          color: data.color,
        });
        if (typeof pin.ink === 'number') {
          inkManagerRef.current.reconcile(pin.ink);
        }
        pinCacheRef.current.set(pin.id, pin);
        lruTickRef.current += 1;
        pinLruRef.current.set(pin.id, lruTickRef.current);

        // Add pin to visible list
        setVisiblePins((prev) => [
          ...prev,
          {
            id: pin.id,
            userId: pin.userId,
            userName: pin.userName ?? '',
            lng: pin.lng,
            lat: pin.lat,
            message: pin.message ?? '',
            color: pin.color ?? '#E63946',
            createdAt: pin.createdAt,
          },
        ]);
        setPinClickCoords(null);
      } catch (e: any) {
        // Reconcile from the server; refund locally only if it is unreachable.
        fetchInk()
          .then(({ ink: serverInk }) => inkManagerRef.current?.reconcile(serverInk))
          .catch(() => inkManagerRef.current?.forceConsume(-PIN_INK_COST));
        Alert.alert(ts('placeFailed', lang), e.message || '');
      } finally {
        setPinLoading(false);
      }
    },
    [pinClickCoords, lang, inkManagerRef]
  );

  const handlePinCancel = useCallback(() => {
    setPinClickCoords(null);
  }, []);

  // ===== Map camera change handler =====
  const updateCamera = useCallback((feature: any) => {
    try {
      const coords = feature?.geometry?.coordinates;
      const props = feature?.properties;
      if (coords && props) {
        setCameraState({
          center: [coords[0], coords[1]] as [number, number],
          zoom: props.zoomLevel ?? props.zoom ?? MAP_DEFAULT_ZOOM,
          bearing: props.heading ?? props.bearing ?? 0,
          pitch: props.pitch ?? 0,
        });
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  const handleRegionChanging = useCallback(
    (feature: any) => {
      // Clear any pending interaction-end timer from a previous gesture.
      // Without this, a timer from a previous drag can fire mid-zoom
      // and incorrectly set isMapInteracting=false, causing zoom desync.
      if (interactionEndTimerRef.current) {
        clearTimeout(interactionEndTimerRef.current);
        interactionEndTimerRef.current = null;
      }

      if (!isMapInteractingRef.current) {
        isMapInteractingRef.current = true;
        setIsMapInteracting(true);
      }

      const now = Date.now();
      if (now - lastCameraUpdateAtRef.current < CAMERA_UPDATE_THROTTLE_MS) {
        return;
      }
      lastCameraUpdateAtRef.current = now;

      updateCamera(feature);
    },
    [updateCamera]
  );

  const handleRegionDidChange = useCallback(
    (feature: any) => {
      updateCamera(feature);

      if (interactionEndTimerRef.current) {
        clearTimeout(interactionEndTimerRef.current);
      }
      interactionEndTimerRef.current = setTimeout(() => {
        isMapInteractingRef.current = false;
        setIsMapInteracting(false);
      }, INTERACTION_SETTLE_MS);

      // 方案 C+D: Only load viewport AFTER interaction fully settles.
      // Instead of debouncing every regionDidChange (which fires during continuous drag),
      // we wait for isMapInteracting to become false, then load.
      if (viewportLoadTimerRef.current) {
        clearTimeout(viewportLoadTimerRef.current);
      }
      viewportLoadTimerRef.current = setTimeout(() => {
        // Only fire if not still interacting (方案 D)
        if (!isMapInteractingRef.current) {
          loadViewport();
        }
      }, 600); // 方案 C: increased from 300ms to 600ms
    },
    [updateCamera, loadViewport]
  );

  // ===== Active brush config for current stroke rendering =====
  const activeBrushConfig = useMemo(
    () => getActiveBrushConfig(currentBrush),
    [currentBrush]
  );

  // ========================
  // Render
  // ========================

  return (
    <View style={styles.page} onLayout={handleLayout}>
      {/* ===== Top Bar Controls ===== */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push(session ? '/profile' : '/login')}
        >
          <Image
            source={session?.avatarUrl ? { uri: `${API_BASE_URL}/api/files/${session.avatarUrl.replace(/^\//, '')}?v=${avatarVersion}` } : require('@/assets/images/react-logo.png')}
            style={styles.avatarImage}
          />
        </TouchableOpacity>
      </View>
      {/* ===== MapLibre GL Native ===== */}
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={styles.map}>
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scrollEnabled={mode === 'hand' || mode === 'pin'}
        zoomEnabled={mode === 'hand' || mode === 'pin'}
        rotateEnabled={false}
        pitchEnabled={false}
        onRegionIsChanging={handleRegionChanging}
        onRegionDidChange={handleRegionDidChange}

        onPress={(e) => {
          handleMapPress(e);
          handleMapBackgroundPress();
        }}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: linkedLocation ? [linkedLocation.lng, linkedLocation.lat] : MAP_DEFAULT_CENTER,
            zoomLevel: linkedLocation?.zoom ?? MAP_DEFAULT_ZOOM,
          }}
        />

        {/* Pins - Native PointAnnotations for stability */}
        {/* Render unconditionally to avoid Fabric view recycling crashes */}
        {/* Pins - Native ShapeSource for stability */}
        <MapPinOverlay
          pins={cameraState.zoom >= MIN_DATA_ZOOM ? visiblePins : []}
          onPinPress={id => {
            const pin = visiblePins.find(p => p.id === id);
            if (pin && !pin.userId) cameraRef.current?.setCamera({ centerCoordinate: [pin.lng, pin.lat], zoomLevel: Math.max(21, cameraState.zoom + 1), animationDuration: 500 });
            else setSelectedPinId(id);
          }}
        />
      </MapLibreGL.MapView>

      {/* ===== Skia Drawing Overlay ===== */}
      <GestureDetector gesture={pan}>
        <View
          style={styles.overlay}
          pointerEvents={mode === 'draw' ? 'auto' : 'none'}
        >
          <Canvas style={styles.canvas}>
            {/* Historical strokes (tile-cached) */}
            {!isMapInteracting && tilePicture && (
              <Picture picture={tilePicture} />
            )}

            {/* Interaction snapshot transform (no per-stroke redraw while panning/zooming) */}
            {isMapInteracting && stableSnapshot && interactionTransform && (
              <Group
                transform={[
                  { translateX: interactionTransform.dx },
                  { translateY: interactionTransform.dy },
                  { translateX: interactionTransform.cx },
                  { translateY: interactionTransform.cy },
                  { scale: interactionTransform.zoomScale },
                  { translateX: -interactionTransform.cx },
                  { translateY: -interactionTransform.cy },
                ]}
              >
                <Picture picture={stableSnapshot} />
              </Group>
            )}

            {/* Current active stroke */}
            {currentPath && (
              <Path
                path={currentPath}
                color={currentColor}
                style="stroke"
                strokeWidth={activeBrushConfig.strokeWidth(currentSize)}
                strokeCap={activeBrushConfig.strokeCap}
                strokeJoin={activeBrushConfig.strokeJoin}
                opacity={currentOpacity * activeBrushConfig.opacity * (strokesTransparent ? 0.3 : 1)}
                blendMode={activeBrushConfig.blendMode}
              />
            )}
          </Canvas>
        </View>
      </GestureDetector>
      </ViewShot>

      {/* ===== Remote Cursors Overlay ===== */}
      <CursorOverlay
        projection={projectionRef.current}
        cursors={remoteCursors}
      />

      {/* ===== UI Overlays ===== */}
      <CreationGuide lang={lang} authenticated={!!session} state={saveState} limited={contentLimited || tileRendererRef.current.limited}
        hasPractice={[...strokesRef.current.values()].some(stroke => stroke.userId === 'anonymous')}
        onStart={() => handleModeChange('draw')} onLogin={() => router.push('/login')}
        onPublish={() => {
          if (!session || !syncManagerRef.current) return;
          for (const old of [...strokesRef.current.values()]) {
            if (old.userId !== 'anonymous') continue;
            strokesRef.current.delete(old.id); tileRendererRef.current.removeStroke(old.id);
            const stroke = { ...old, id: generateId(), userId: session.userId, userName: session.userName, createdAt: Date.now() };
            strokesRef.current.set(stroke.id, stroke); tileRendererRef.current.addStroke(stroke);
            void syncManagerRef.current.broadcastStroke(stroke);
          }
          historyRef.current?.clear(); bumpStrokeVersion();
        }}
        onShare={() => {
          const url = `${API_BASE_URL}/canvas?${mapLocationQuery({ lng: cameraState.center[0], lat: cameraState.center[1], zoom: cameraState.zoom })}&via=shared`;
          void Share.share({ title: 'DrawMaps', message: `${journeyText('share', lang)} ${url}`, url }).then(result => { if (result.action === Share.sharedAction) trackEvent('share'); }).catch(() => undefined);
        }} />

      {/* Zoom hint (draw mode) */}
      {mode === 'draw' && cameraState.zoom < MIN_DRAW_ZOOM && (
        <View style={styles.hintBadge}>
          <Text style={styles.hintText}>
            {tf('zoomHintDraw', lang)(MIN_DRAW_ZOOM, Math.floor(cameraState.zoom))}
          </Text>
        </View>
      )}

      {/* Zoom hint (pin mode) */}
      {mode === 'pin' && cameraState.zoom < MIN_PIN_ZOOM && (
        <View style={styles.hintBadge}>
          <Text style={styles.hintText}>
            {tf('zoomHintPin', lang)(MIN_PIN_ZOOM, Math.floor(cameraState.zoom))}
          </Text>
        </View>
      )}

      {/* Ink depleted warning */}
      {ink <= 0 && (
        <View style={[styles.hintBadge, styles.hintDanger]}>
          <Text style={styles.hintText}>{ts('inkDepleted', lang)}</Text>
        </View>
      )}

      {/* Zoom controls (replaces old zoom indicator) */}
      <ZoomControls
        currentZoom={cameraState.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomDelta={handleZoomDelta}
      />

      {/* Pin placement panel */}
      {pinClickCoords && (
        <PinPlacer
          coordinates={pinClickCoords}
          onPlace={handlePinPlace}
          onCancel={handlePinCancel}
          loading={pinLoading}
        />
      )}

      {/* ===== Drawing Toolbar ===== */}
      <DrawingToolbar
        currentMode={mode}
        onModeChange={handleModeChange}
        currentColor={currentColor}
        onColorSelect={setCurrentColor}
        currentBrush={currentBrush}
        onBrushSelect={setCurrentBrush}
        currentSize={currentSize}
        onSizeChange={setCurrentSize}
        currentOpacity={currentOpacity}
        onOpacityChange={setCurrentOpacity}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        ink={ink}
        maxInk={100}

        currentZoom={cameraState.zoom}
        strokesTransparent={strokesTransparent}
        onToggleTransparency={() => setStrokesTransparent((v) => !v)}
      />

      {/* ===== Selected Pin Tooltip (Outside MapView) ===== */}
      {selectedPinId && (() => {
        const pin = visiblePins.find(p => p.id === selectedPinId);
        if (!pin) return null;
        const screenPos = projectionRef.current.geoToScreen(pin.lng, pin.lat);
        return (
          <MapPinTooltip
            pin={pin}
            screenX={screenPos.x}
            screenY={screenPos.y}
            onDismiss={() => setSelectedPinId(null)}
          />
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 200,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  map: {
    flex: 1,
    alignSelf: 'stretch',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  canvas: {
    flex: 1,
  },
  hintBadge: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  hintDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  hintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
