/**
 * MapScreen — Core map + drawing screen.
 *
 * Architecture matches the web version:
 * - MapLibre GL Native (full-screen map with OpenFreeMap Liberty tiles)
 * - Skia Canvas overlay (composite + active layers)
 * - Geo-coordinate storage (screen coords → geo on endStroke, geo → screen on render)
 * - Zoom-dependent stroke visibility and scaling
 * - InkManager + HistoryManager for game mechanics
 *
 * Key differences from web:
 * - Uses Skia instead of Canvas2D for rendering
 * - Uses react-native-gesture-handler instead of PointerEvents
 * - Coordinate conversion via local Mercator math (sync) instead of MapLibre bridge (async)
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
  type LayoutChangeEvent,
} from 'react-native';
import MapLibreGL, { type CameraRef } from '@maplibre/maplibre-react-native';
import {
  Canvas,
  Path,
  Group,
  Paint,
  Skia,
  type SkPath,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DrawingToolbar from '@/components/DrawingToolbar';
import ZoomControls from '@/components/ZoomControls';
import PinPlacer from '@/components/PinPlacer';
import {
  fetchDrawings,
  fetchPins,
  saveDrawings,
  createPin,
  type MapPin,
} from '@/lib/api';
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
  buildBezierPath,
  buildLinearPath,
  generateSprayParticles,
  buildSprayPaths,
  hashString,
  generateId,
} from '@/core';
import type { StrokeData, StrokePoint, CameraState } from '@/core/types';

// ========================
// MapLibre Configuration
// ========================

MapLibreGL.setAccessToken(null);

/** OpenFreeMap Liberty — same tiles as web version, free, no API key */
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// ========================
// Brush Rendering Configuration
// ========================

/** SkEnum string literals (react-native-skia v2 uses Uncapitalize<keyof T>) */
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

interface BrushRenderConfig {
  buildPath: (points: { x: number; y: number }[]) => SkPath;
  strokeWidth: (baseSize: number) => number;
  opacity: number;
  blendMode: SkBlendMode;
  strokeCap: SkStrokeCap;
  strokeJoin: SkStrokeJoin;
  /** Marker uses a layer group for non-stacking effect */
  useLayer?: boolean;
  layerOpacity?: number;
  /** Spray brush renders particles instead of a path */
  isSpray?: boolean;
}

function getBrushRenderConfig(brushId: string): BrushRenderConfig {
  switch (brushId) {
    case BRUSH_IDS.PENCIL:
      return {
        buildPath: buildBezierPath,
        strokeWidth: (s) => s,
        opacity: 1.0,
        blendMode: 'srcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
      };

    case BRUSH_IDS.MARKER:
      // Web: OffscreenCanvas at opacity=1, composite at globalAlpha=0.3
      // Skia: Group layer with Paint opacity=0.3, inner path at opacity=1
      return {
        buildPath: buildLinearPath,
        strokeWidth: (s) => s * 3,
        opacity: 1.0,
        blendMode: 'srcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
        useLayer: true,
        layerOpacity: 0.3,
      };

    case BRUSH_IDS.HIGHLIGHTER:
      // Web: globalCompositeOperation='multiply', lineCap='square', size*2.5, opacity=0.4
      return {
        buildPath: buildLinearPath,
        strokeWidth: (s) => s * 2.5,
        opacity: 0.4,
        blendMode: 'multiply',
        strokeCap: 'butt',
        strokeJoin: 'bevel',
      };

    case BRUSH_IDS.ERASER:
      return {
        buildPath: buildLinearPath,
        strokeWidth: (s) => s * 5,
        opacity: 1.0,
        blendMode: 'clear',
        strokeCap: 'round',
        strokeJoin: 'round',
      };

    case BRUSH_IDS.SPRAY:
      return {
        buildPath: buildLinearPath,
        strokeWidth: (s) => s,
        opacity: 0.5,
        blendMode: 'srcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
        isSpray: true,
      };

    default:
      return {
        buildPath: buildBezierPath,
        strokeWidth: (s) => s,
        opacity: 1.0,
        blendMode: 'srcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
      };
  }
}

// ========================
// Rendered stroke (with precomputed Skia paths)
// ========================

interface RenderedStroke {
  data: StrokeData;
  path: SkPath;
  screenSize: number;
  config: BrushRenderConfig;
  sprayPaths?: { path: SkPath; alpha: number }[];
}

// ========================
// Main Component
// ========================

export default function MapScreen() {
  // ===== Layout =====
  const [screenSize, setScreenSize] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  // ===== Camera state (tracked from MapView events) =====
  const [cameraState, setCameraState] = useState<CameraState>({
    center: MAP_DEFAULT_CENTER as [number, number],
    zoom: MAP_DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  });

  // ===== Projection (updated synchronously during render) =====
  const projectionRef = useRef(new MercatorProjection());

  // Update projection synchronously — runs before useMemo
  projectionRef.current.update(
    cameraState.center,
    cameraState.zoom,
    screenSize.width,
    screenSize.height,
    cameraState.bearing
  );

  // ===== Engine managers (refs, no re-renders) =====
  const inkManagerRef = useRef<InkManager | null>(null);
  const historyRef = useRef<HistoryManager | null>(null);

  // ===== Camera ref for programmatic zoom =====
  const cameraRef = useRef<CameraRef | null>(null);

  // ===== Reactive state =====
  const [mode, setMode] = useState<'hand' | 'draw' | 'pin'>('draw');
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [ink, setInk] = useState(100);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ===== Pin state =====
  const [pins, setPins] = useState<MapPin[]>([]);
  const [pinClickCoords, setPinClickCoords] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // ===== Remote data loading state =====
  const [loadedStrokeIds, setLoadedStrokeIds] = useState<Set<string>>(
    new Set()
  );
  const viewportLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // ===== Tool state =====
  const [currentBrush, setCurrentBrush] = useState<BrushId>(BRUSH_IDS.PENCIL);
  const [currentColor, setCurrentColor] = useState<string>(DEFAULT_COLOR);
  const [currentSize, setCurrentSize] = useState<number>(DEFAULT_SIZE);
  const [currentOpacity, setCurrentOpacity] = useState<number>(DEFAULT_OPACITY);

  // ===== Active drawing state =====
  const currentPointsRef = useRef<
    { x: number; y: number; pressure: number; timestamp: number }[]
  >([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const inkAccumulatorRef = useRef(0);

  // ===== Refs for gesture callbacks (avoid stale closures) =====
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

  // ===== Initialize managers =====
  useEffect(() => {
    inkManagerRef.current = new InkManager((inkValue) => setInk(inkValue));
    historyRef.current = new HistoryManager(100, (canU, canR) => {
      setCanUndo(canU);
      setCanRedo(canR);
    });

    return () => {
      inkManagerRef.current?.dispose();
    };
  }, []);

  // ===== Viewport loading: fetch drawings + pins from API on camera change =====
  const loadViewport = useCallback(async () => {
    const proj = projectionRef.current;
    const bounds = proj.getViewportBounds();
    const zoom = cameraZoomRef.current;

    try {
      const [remoteStrokes, remotePins] = await Promise.all([
        fetchDrawings({
          minLat: bounds.minLat,
          maxLat: bounds.maxLat,
          minLng: bounds.minLng,
          maxLng: bounds.maxLng,
          zoom,
        }),
        fetchPins({
          minLat: bounds.minLat,
          maxLat: bounds.maxLat,
          minLng: bounds.minLng,
          maxLng: bounds.maxLng,
        }),
      ]);

      // Merge remote strokes (avoid duplicating locally-created ones)
      if (remoteStrokes.length > 0) {
        setStrokes((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newRemote = remoteStrokes.filter(
            (s) => !existingIds.has(s.id)
          );
          if (newRemote.length === 0) return prev;
          return [...prev, ...newRemote];
        });
        setLoadedStrokeIds((prev) => {
          const next = new Set(prev);
          remoteStrokes.forEach((s) => next.add(s.id));
          return next;
        });
      }

      // Replace pins (always full set from server)
      setPins(remotePins);
    } catch (e) {
      console.warn('[loadViewport] Failed:', e);
    }
  }, []);

  // Trigger initial load
  useEffect(() => {
    // Small delay to let camera settle
    const timer = setTimeout(loadViewport, 500);
    return () => clearTimeout(timer);
  }, [loadViewport]);

  // ===== Render historical strokes (recompute on camera or strokes change) =====
  const renderedStrokes = useMemo<RenderedStroke[]>(() => {
    const proj = projectionRef.current;
    const currentZoom = cameraState.zoom;

    return strokes
      .filter((s) => {
        // Zoom visibility rule (web: currentZoom >= createdZoom - STROKE_HIDE_ZOOM_DIFF)
        if (currentZoom < s.createdZoom - STROKE_HIDE_ZOOM_DIFF) return false;

        // Viewport bounds check
        const bounds = proj.getViewportBounds();
        if (
          s.bounds.maxLng < bounds.minLng ||
          s.bounds.minLng > bounds.maxLng
        )
          return false;
        if (
          s.bounds.maxLat < bounds.minLat ||
          s.bounds.minLat > bounds.maxLat
        )
          return false;

        return true;
      })
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((s) => {
        const config = getBrushRenderConfig(s.brushId);

        // Zoom-scale: screenSize = storedSize * 2^(currentZoom - createdZoom)
        const zoomScale = Math.pow(2, currentZoom - s.createdZoom);
        const scaledSize = config.strokeWidth(s.size) * zoomScale;

        // Convert geo points → screen points
        const screenPoints = s.points.map((p) => {
          const sp = proj.geoToScreen(p.x, p.y);
          return { x: sp.x, y: sp.y, pressure: p.pressure };
        });

        const rendered: RenderedStroke = {
          data: s,
          path: config.buildPath(screenPoints),
          screenSize: Math.max(0.5, scaledSize),
          config,
        };

        // Generate spray particles (bucketed for efficient rendering)
        if (config.isSpray) {
          const radius = s.size * zoomScale * 0.75;
          const particles = generateSprayParticles(
            screenPoints,
            radius,
            hashString(s.id)
          );
          rendered.sprayPaths = buildSprayPaths(particles);
        }

        return rendered;
      });
  }, [strokes, cameraState, screenSize]);

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

    setStrokes((prev) => [...prev, stroke]);
    historyRef.current?.push({ type: 'ADD_STROKE', stroke });

    // Persist to server (fire-and-forget, don't block UI)
    saveDrawings(stroke).catch((e) =>
      console.warn('[saveDrawings] Failed:', e)
    );

    currentPointsRef.current = [];
    inkAccumulatorRef.current = 0;
    setCurrentPath(null);
  }, []);

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

      const config = getBrushRenderConfig(currentBrushRef.current);
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
      const config = getBrushRenderConfig(currentBrushRef.current);
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
      setStrokes((prev) => prev.filter((s) => s.id !== cmd.stroke.id));
    } else if (cmd.type === 'DELETE_STROKE') {
      setStrokes((prev) => [...prev, cmd.stroke]);
    }
  }, []);

  const handleRedo = useCallback(() => {
    const cmd = historyRef.current?.redo();
    if (!cmd) return;

    if (cmd.type === 'ADD_STROKE') {
      setStrokes((prev) => [...prev, cmd.stroke]);
    } else if (cmd.type === 'DELETE_STROKE') {
      setStrokes((prev) => prev.filter((s) => s.id !== cmd.stroke.id));
    }
  }, []);

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
        setPins((prev) => [...prev, pin]);
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
  const changingThrottleRef = useRef(false);

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
      if (changingThrottleRef.current) return;
      changingThrottleRef.current = true;
      setTimeout(() => {
        changingThrottleRef.current = false;
      }, 50);
      updateCamera(feature);
    },
    [updateCamera]
  );

  const handleRegionDidChange = useCallback(
    (feature: any) => {
      updateCamera(feature);

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
    () => getBrushRenderConfig(currentBrush),
    [currentBrush]
  );

  // ========================
  // Render
  // ========================

  return (
    <View style={styles.page} onLayout={handleLayout}>
      {/* ===== MapLibre GL Native ===== */}
      <MapLibreGL.MapView
        style={styles.map}
        mapStyle={MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        scrollEnabled={mode === 'hand' || mode === 'pin'}
        zoomEnabled={mode === 'hand' || mode === 'pin'}
        rotateEnabled={mode === 'hand' || mode === 'pin'}
        pitchEnabled={false}
        onRegionIsChanging={handleRegionChanging}
        onRegionDidChange={handleRegionDidChange}
        onPress={handleMapPress}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: MAP_DEFAULT_CENTER,
            zoomLevel: MAP_DEFAULT_ZOOM,
          }}
        />

        {/* Render pin markers */}
        {pins.map((pin) => (
          <MapLibreGL.PointAnnotation
            key={pin.id}
            id={pin.id}
            coordinate={[pin.lng, pin.lat]}
            title={pin.userName}
            snippet={pin.message}
          >
            <View
              style={[styles.pinMarker, { backgroundColor: pin.color }]}
            >
              <Text style={styles.pinEmoji}>📌</Text>
            </View>
            <MapLibreGL.Callout title={`${pin.userName}: ${pin.message}`} />
          </MapLibreGL.PointAnnotation>
        ))}
      </MapLibreGL.MapView>

      {/* ===== Skia Drawing Overlay ===== */}
      <GestureDetector gesture={pan}>
        <View
          style={styles.overlay}
          pointerEvents={mode === 'draw' ? 'auto' : 'none'}
        >
          <Canvas style={styles.canvas}>
            {/* Historical strokes */}
            {renderedStrokes.map((rs) => {
              // Spray: render particle paths grouped by alpha
              if (rs.config.isSpray && rs.sprayPaths) {
                return (
                  <Group key={rs.data.id}>
                    {rs.sprayPaths.map((sp, i) => (
                      <Path
                        key={i}
                        path={sp.path}
                        color={rs.data.color}
                        style="fill"
                        opacity={rs.data.opacity * sp.alpha}
                      />
                    ))}
                  </Group>
                );
              }

              // Marker: layer group for non-stacking effect
              if (rs.config.useLayer) {
                return (
                  <Group
                    key={rs.data.id}
                    layer={
                      <Paint opacity={rs.config.layerOpacity ?? 0.3} />
                    }
                  >
                    <Path
                      path={rs.path}
                      color={rs.data.color}
                      style="stroke"
                      strokeWidth={rs.screenSize}
                      strokeCap={rs.config.strokeCap}
                      strokeJoin={rs.config.strokeJoin}
                      opacity={1.0}
                      blendMode={rs.config.blendMode}
                    />
                  </Group>
                );
              }

              // Regular strokes (pencil, highlighter, eraser)
              return (
                <Path
                  key={rs.data.id}
                  path={rs.path}
                  color={rs.data.color}
                  style="stroke"
                  strokeWidth={rs.screenSize}
                  strokeCap={rs.config.strokeCap}
                  strokeJoin={rs.config.strokeJoin}
                  opacity={rs.data.opacity * rs.config.opacity}
                  blendMode={rs.config.blendMode}
                />
              );
            })}

            {/* Current active stroke */}
            {currentPath &&
              (activeBrushConfig.useLayer ? (
                <Group
                  layer={
                    <Paint
                      opacity={activeBrushConfig.layerOpacity ?? 0.3}
                    />
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
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f0f0f0',
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
  pinMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pinEmoji: {
    fontSize: 16,
  },
});
