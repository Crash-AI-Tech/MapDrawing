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
 * - Spray progressive degradation
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
  Image,
  type LayoutChangeEvent,
} from 'react-native';
import MapLibreGL, { type CameraRef } from '@maplibre/maplibre-react-native';
import {
  Canvas,
  Path,
  Group,
  Paint,
  Skia,
  Picture,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  BlendMode,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DrawingToolbar from '@/components/DrawingToolbar';
import ZoomControls from '@/components/ZoomControls';
import PinPlacer from '@/components/PinPlacer';
import MapPinOverlay, { MapPinTooltip, type PinData } from '@/components/MapPinOverlay';
import { useRouter } from 'expo-router';
import {
  fetchDrawings,
  fetchPins,
  saveDrawings,
  createPin,
  getToken,
  fetchProfile,
  type MapPin,
  type PinCluster,
  type PinItem,
  type PageCursor,
} from '@/lib/api';
import { API_BASE_URL, DO_BASE_URL } from '@/lib/config';
import { SyncManager } from '@/core/sync/SyncManager';
import {
  BRUSH_IDS,
  type BrushId,
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  DEFAULT_OPACITY,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MIN_DRAW_ZOOM,
  MIN_PIN_ZOOM,
  PIN_INK_COST,
  STROKE_HIDE_ZOOM_DIFF,
  VIEWPORT_LOAD_DEBOUNCE,
} from '@niubi/shared';
import {
  MercatorProjection,
  InkManager,
  HistoryManager,
  TileRenderer,
  buildBezierPath,
  buildLinearPath,
  generateId,
  BASE_ZOOM,
} from '@/core';
import type { StrokeData, StrokePoint, CameraState } from '@/core/types';

// ========================
// MapLibre Configuration
// ========================

MapLibreGL.setAccessToken(null);
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// ========================
// Active Brush Config (only used for the live stroke being drawn)
// ========================

type SkStrokeCap = 'butt' | 'round' | 'square';
type SkStrokeJoin = 'bevel' | 'miter' | 'round';
type SkBlendMode =
  | 'clear' | 'src' | 'dst' | 'srcOver' | 'dstOver'
  | 'srcIn' | 'dstIn' | 'srcOut' | 'dstOut'
  | 'srcATop' | 'dstATop' | 'xor' | 'plus' | 'modulate'
  | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'colorDodge' | 'colorBurn' | 'hardLight' | 'softLight'
  | 'difference' | 'exclusion' | 'multiply'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

interface ActiveBrushConfig {
  buildPath: (points: { x: number; y: number }[]) => SkPath;
  strokeWidth: (baseSize: number) => number;
  opacity: number;
  blendMode: SkBlendMode;
  strokeCap: SkStrokeCap;
  strokeJoin: SkStrokeJoin;
  useLayer?: boolean;
  layerOpacity?: number;
  isSpray?: boolean;
}

function getActiveBrushConfig(brushId: string): ActiveBrushConfig {
  switch (brushId) {
    case BRUSH_IDS.PENCIL:
      return {
        buildPath: buildBezierPath, strokeWidth: (s) => s,
        opacity: 1.0, blendMode: 'srcOver', strokeCap: 'round', strokeJoin: 'round',
      };
    case BRUSH_IDS.MARKER:
      return {
        buildPath: buildLinearPath, strokeWidth: (s) => s * 3,
        opacity: 1.0, blendMode: 'srcOver', strokeCap: 'round', strokeJoin: 'round',
        useLayer: true, layerOpacity: 0.3,
      };
    case BRUSH_IDS.HIGHLIGHTER:
      return {
        buildPath: buildLinearPath, strokeWidth: (s) => s * 2.5,
        opacity: 0.4, blendMode: 'multiply', strokeCap: 'butt', strokeJoin: 'bevel',
      };
    case BRUSH_IDS.ERASER:
      return {
        buildPath: buildLinearPath, strokeWidth: (s) => s * 5,
        opacity: 1.0, blendMode: 'clear', strokeCap: 'round', strokeJoin: 'round',
      };
    case BRUSH_IDS.SPRAY:
      return {
        buildPath: buildLinearPath, strokeWidth: (s) => s,
        opacity: 0.5, blendMode: 'srcOver', strokeCap: 'round', strokeJoin: 'round',
        isSpray: true,
      };
    default:
      return {
        buildPath: buildBezierPath, strokeWidth: (s) => s,
        opacity: 1.0, blendMode: 'srcOver', strokeCap: 'round', strokeJoin: 'round',
      };
  }
}

// ========================
// Pagination & Interaction Constants
// ========================

const DRAWINGS_PAGE_SIZE = 250;
const DRAWINGS_MAX_PAGES = 6;
const DRAWINGS_MAX_CACHE = 2500;
const PINS_PAGE_SIZE = 120;
const PINS_MAX_PAGES = 4;
const PINS_MAX_CACHE = 800;
const CAMERA_UPDATE_THROTTLE_MS = 16;
const INTERACTION_SETTLE_MS = 120;

// ========================
// Main Component
// ========================

export default function MapScreen() {
  // ===== Layout =====
  const [screenSize, setScreenSize] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  // ===== Camera State =====
  const [cameraState, setCameraState] = useState<CameraState>({
    center: MAP_DEFAULT_CENTER as [number, number],
    zoom: MAP_DEFAULT_ZOOM,
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
  const inkManagerRef = useRef<InkManager | null>(null);
  const historyRef = useRef<HistoryManager | null>(null);
  const cameraRef = useRef<CameraRef | null>(null);

  // ===== Tile Renderer (core of scheme A) =====
  const tileRendererRef = useRef(new TileRenderer());

  // ===== Reactive State =====
  const [mode, setMode] = useState<'hand' | 'draw' | 'pin'>('hand');
  const [ink, setInk] = useState(100);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ===== Real-time Collaboration =====
  const [session, setSession] = useState<{ token: string; userId: string } | null>(null);
  const syncManagerRef = useRef<SyncManager | null>(null);



  // ===== Strokes: ref-based (no React state for big arrays) =====
  const strokesRef = useRef<Map<string, StrokeData>>(new Map());
  const [strokeVersion, setStrokeVersion] = useState(0);
  const bumpStrokeVersion = useCallback(() => setStrokeVersion((v) => v + 1), []);

  // 1. Initial Auth
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const profile = await fetchProfile();
        setSession({ token, userId: profile.id });
      } catch (e) {
        console.warn('[MapScreen] Failed to fetch profile', e);
      }
    })();
  }, []);

  // 2. Init SyncManager
  useEffect(() => {
    if (!session) return;

    syncManagerRef.current = new SyncManager({
      doBaseUrl: DO_BASE_URL,
      accessToken: session.token,
      userId: session.userId,
      onRemoteStroke: (stroke) => {
        strokesRef.current.set(stroke.id, stroke);
        loadedStrokeIdsRef.current.add(stroke.id);
        tileRendererRef.current.addStroke(stroke);
        bumpStrokeVersion();
      },
      onRemoteDelete: (strokeId) => {
        strokesRef.current.delete(strokeId);
        loadedStrokeIdsRef.current.delete(strokeId);
        tileRendererRef.current.removeStroke(strokeId);
        bumpStrokeVersion();
      },
    });

    // Join initial room
    syncManagerRef.current.joinRoom(cameraState.center[1], cameraState.center[0]);

    return () => {
      syncManagerRef.current?.dispose();
    };
  }, [session, bumpStrokeVersion]); // cameraState initial read is safe

  // 3. Update Room (Real-time)
  useEffect(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.joinRoom(cameraState.center[1], cameraState.center[0]);
    }
  }, [cameraState.center]);

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

  // ===== Remote Data Loading =====
  const loadedStrokeIdsRef = useRef<Set<string>>(new Set());
  const strokeLruRef = useRef<Map<string, number>>(new Map());
  const lruTickRef = useRef(0);
  const viewportLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ===== Active Drawing State =====
  const currentPointsRef = useRef<
    { x: number; y: number; pressure: number; timestamp: number }[]
  >([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
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

  // ===== Initialize Managers =====
  useEffect(() => {
    inkManagerRef.current = new InkManager((inkValue) => setInk(inkValue));
    historyRef.current = new HistoryManager(100, (canU, canR) => {
      setCanUndo(canU);
      setCanRedo(canR);
    });
    return () => {
      inkManagerRef.current?.dispose();
      tileRendererRef.current.clear();
    };
  }, []);

  // ===== Viewport loading: paginated fetch + TileRenderer update =====
  const loadViewport = useCallback(async () => {
    const proj = projectionRef.current;
    const bounds = proj.getViewportBounds();
    const zoom = cameraZoomRef.current;

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
      // --- Load Strokes (paginated) ---
      let strokeCursor: PageCursor | null = null;
      let strokePageCount = 0;
      let newStrokesAdded = false;

      do {
        const page = await fetchDrawings({
          minLat: bounds.minLat, maxLat: bounds.maxLat,
          minLng: bounds.minLng, maxLng: bounds.maxLng,
          zoom, limit: DRAWINGS_PAGE_SIZE, cursor: strokeCursor,
        });
        for (const stroke of page.items) {
          if (!strokesRef.current.has(stroke.id)) newStrokesAdded = true;
          strokesRef.current.set(stroke.id, stroke);
          loadedStrokeIdsRef.current.add(stroke.id);
          touchStroke(stroke.id);
        }
        strokeCursor = page.nextCursor;
        strokePageCount += 1;
      } while (strokeCursor && strokePageCount < DRAWINGS_MAX_PAGES);

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

      // Update tile renderer incrementally
      tileRendererRef.current.updateStrokes(
        Array.from(strokesRef.current.values())
      );
      if (newStrokesAdded) bumpStrokeVersion();

      // Update Room (Real-time)
      if (syncManagerRef.current) {
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLng = (bounds.minLng + bounds.maxLng) / 2;
        syncManagerRef.current.joinRoom(centerLat, centerLng);
      }

      // --- Load Pins (paginated/clustered) ---
      const pinFirstPage = await fetchPins({
        minLat: bounds.minLat, maxLat: bounds.maxLat,
        minLng: bounds.minLng, maxLng: bounds.maxLng,
        zoom, limit: PINS_PAGE_SIZE,
      });

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
            message: `${c.count} pins`,
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
            minLat: bounds.minLat, maxLat: bounds.maxLat,
            minLng: bounds.minLng, maxLng: bounds.maxLng,
            zoom, limit: PINS_PAGE_SIZE, cursor: pinCursor,
          });
          rawPins.push(
            ...nextPage.items.filter((i): i is PinItem => i.type === 'pin')
          );
          pinCursor = nextPage.nextCursor;
          pinPageCount += 1;
        }

        rawPins.forEach((pin) => {
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
    } catch (e) {
      console.warn('[loadViewport] Failed:', e);
    }
  }, [bumpStrokeVersion]);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(loadViewport, 500);
    return () => clearTimeout(timer);
  }, [loadViewport]);

  // ===== Tile-based Picture (idle: composed from cached tile images) =====
  const tilePicture = useMemo(() => {
    if (isMapInteracting) return null;
    void strokeVersion; // dependency to re-render on stroke changes

    return tileRendererRef.current.renderFrame(
      cameraState.center,
      cameraState.zoom,
      screenSize.width,
      screenSize.height,
      cameraState.bearing
    );
  }, [isMapInteracting, strokeVersion, cameraState.center, cameraState.zoom, cameraState.bearing, screenSize]);

  // ===== Stable Snapshot for Interaction =====
  useEffect(() => {
    if (!isMapInteracting && tilePicture) {
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
      userId: 'local',
      userName: 'Local',
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
    } else {
      saveDrawings(stroke).catch((e) =>
        console.warn('[saveDrawings] Failed:', e)
      );
    }

    currentPointsRef.current = [];
    inkAccumulatorRef.current = 0;
    setCurrentPath(null);
  }, [bumpStrokeVersion]);

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

      const config = getActiveBrushConfig(currentBrushRef.current);
      const path = config.buildPath([{ x: g.x, y: g.y }]);
      setCurrentPath(path);
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

      // Rebuild Skia path from all points (Bézier or linear based on brush)
      const config = getActiveBrushConfig(currentBrushRef.current);
      const path = config.buildPath(points);
      setCurrentPath(path);
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
    } else if (cmd.type === 'DELETE_STROKE') {
      strokesRef.current.set(cmd.stroke.id, cmd.stroke);
      tileRendererRef.current.addStroke(cmd.stroke);
    }
    bumpStrokeVersion();
  }, [bumpStrokeVersion]);

  const handleRedo = useCallback(() => {
    const cmd = historyRef.current?.redo();
    if (!cmd) return;

    if (cmd.type === 'ADD_STROKE') {
      strokesRef.current.set(cmd.stroke.id, cmd.stroke);
      tileRendererRef.current.addStroke(cmd.stroke);
    } else if (cmd.type === 'DELETE_STROKE') {
      strokesRef.current.delete(cmd.stroke.id);
      tileRendererRef.current.removeStroke(cmd.stroke.id);
    }
    bumpStrokeVersion();
  }, [bumpStrokeVersion]);

  // ===== Layout =====
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setScreenSize({ width, height });
  }, []);

  // ===== Zoom controls =====
  const handleZoomIn = useCallback(() => {
    cameraRef.current?.setCamera({
      zoomLevel: Math.min(22, cameraState.zoom + 1),
      animationDuration: 200,
    });
  }, [cameraState.zoom]);

  const handleZoomOut = useCallback(() => {
    cameraRef.current?.setCamera({
      zoomLevel: Math.max(1, cameraState.zoom - 1),
      animationDuration: 200,
    });
  }, [cameraState.zoom]);

  // ===== Pin placement =====
  const handleMapPress = useCallback(
    (feature: any) => {
      if (mode !== 'pin') return;
      if (cameraState.zoom < MIN_PIN_ZOOM) {
        Alert.alert('提示', `请放大到 ${MIN_PIN_ZOOM} 级以上才能放置图钉`);
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
    [mode, cameraState.zoom]
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
        Alert.alert('墨水不足', `放置图钉需要 ${PIN_INK_COST} 墨水`);
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
        // Refund ink on failure
        inkManagerRef.current?.forceConsume(-PIN_INK_COST);
        Alert.alert('放置失败', e.message || '请重试');
      } finally {
        setPinLoading(false);
      }
    },
    [pinClickCoords]
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
          zoom: props.zoomLevel ?? MAP_DEFAULT_ZOOM,
          bearing: props.heading ?? 0,
          pitch: props.pitch ?? 0,
        });
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  const handleRegionChanging = useCallback(
    (feature: any) => {
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

      // Debounced viewport loading (matches web: VIEWPORT_LOAD_DEBOUNCE = 300ms)
      if (viewportLoadTimerRef.current) {
        clearTimeout(viewportLoadTimerRef.current);
      }
      viewportLoadTimerRef.current = setTimeout(() => {
        loadViewport();
      }, VIEWPORT_LOAD_DEBOUNCE);
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
          onPress={() => router.push('/(app)/profile')}
        >
          <Image
            source={require('@/assets/images/react-logo.png')}
            style={styles.avatarImage}
          />
        </TouchableOpacity>
      </View>
      {/* ===== MapLibre GL Native ===== */}
      <MapLibreGL.MapView
        style={styles.map}
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
            centerCoordinate: MAP_DEFAULT_CENTER,
            zoomLevel: MAP_DEFAULT_ZOOM,
          }}
        />

        {/* Pins - Native PointAnnotations for stability */}
        {/* Render unconditionally to avoid Fabric view recycling crashes */}
        {/* Pins - Native ShapeSource for stability */}
        <MapPinOverlay
          pins={cameraState.zoom >= MIN_PIN_ZOOM ? visiblePins : []}
          onPinPress={setSelectedPinId}
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
            {currentPath &&
              (activeBrushConfig.useLayer ? (
                <Group
                  layer={
                    <Paint opacity={activeBrushConfig.layerOpacity ?? 0.3} />
                  }
                >
                  <Path
                    path={currentPath}
                    color={currentColor}
                    style="stroke"
                    strokeWidth={activeBrushConfig.strokeWidth(currentSize)}
                    strokeCap={activeBrushConfig.strokeCap}
                    strokeJoin={activeBrushConfig.strokeJoin}
                    opacity={1.0}
                    blendMode={activeBrushConfig.blendMode}
                  />
                </Group>
              ) : (
                <Path
                  path={currentPath}
                  color={currentColor}
                  style="stroke"
                  strokeWidth={activeBrushConfig.strokeWidth(currentSize)}
                  strokeCap={activeBrushConfig.strokeCap}
                  strokeJoin={activeBrushConfig.strokeJoin}
                  opacity={currentOpacity * activeBrushConfig.opacity}
                  blendMode={activeBrushConfig.blendMode}
                />
              ))}
          </Canvas>
        </View>
      </GestureDetector>




      {/* ===== UI Overlays ===== */}

      {/* Zoom hint (draw mode) */}
      {mode === 'draw' && cameraState.zoom < MIN_DRAW_ZOOM && (
        <View style={styles.hintBadge}>
          <Text style={styles.hintText}>
            请放大到 {MIN_DRAW_ZOOM} 级以上才能绘画（当前{' '}
            {Math.floor(cameraState.zoom)} 级）
          </Text>
        </View>
      )}

      {/* Zoom hint (pin mode) */}
      {mode === 'pin' && cameraState.zoom < MIN_PIN_ZOOM && (
        <View style={styles.hintBadge}>
          <Text style={styles.hintText}>
            请放大到 {MIN_PIN_ZOOM} 级以上才能放置图钉（当前{' '}
            {Math.floor(cameraState.zoom)} 级）
          </Text>
        </View>
      )}

      {/* Ink depleted warning */}
      {ink <= 0 && (
        <View style={[styles.hintBadge, styles.hintDanger]}>
          <Text style={styles.hintText}>墨水耗尽，请稍等片刻…</Text>
        </View>
      )}

      {/* Zoom controls (replaces old zoom indicator) */}
      <ZoomControls
        currentZoom={cameraState.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
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
        onModeChange={setMode}
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
