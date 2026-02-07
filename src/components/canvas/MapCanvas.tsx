'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  MAP_STYLE_URL,
  MIN_DRAW_ZOOM,
  MIN_PIN_ZOOM,
  PIN_INK_COST,
} from '@/constants';
import { useDrawingEngine } from '@/hooks/useDrawingEngine';
import { useSync } from '@/hooks/useSync';
import { useViewport } from '@/hooks/useViewport';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useDrawingStore } from '@/stores/drawingStore';
import { useInkStore } from '@/stores/inkStore';
import { usePinStore, MapPin } from '@/stores/pinStore';
import PinPlacer from '@/components/pins/PinPlacer';
import PinPopup from '@/components/pins/PinPopup';

const VIEWPORT_STORAGE_KEY = 'niubi-map-viewport';

function getSavedViewport(): { center: [number, number]; zoom: number } | null {
  try {
    const raw = localStorage.getItem(VIEWPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed.center) &&
      parsed.center.length === 2 &&
      typeof parsed.zoom === 'number'
    ) {
      return parsed;
    }
  } catch {}
  return null;
}

function saveViewport(center: { lng: number; lat: number }, zoom: number) {
  try {
    localStorage.setItem(
      VIEWPORT_STORAGE_KEY,
      JSON.stringify({ center: [center.lng, center.lat], zoom })
    );
  } catch {}
}

/**
 * MapCanvas — the core canvas component.
 * Initializes MapLibre GL, overlays drawing canvases, and wires the full pipeline.
 */
export default function MapCanvas() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // engine state — triggers re-render so useSync/useViewport get a non-null engine
  const [engine, setEngine] = useState<import('@/core/engine/DrawingEngine').DrawingEngine | null>(null);
  const [currentZoom, setCurrentZoom] = useState(MAP_DEFAULT_ZOOM);

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const syncState = useUIStore((s) => s.syncState);
  const drawingMode = useDrawingStore((s) => s.drawingMode);
  const showLowInkWarning = useInkStore((s) => s.showLowInkWarning);
  const ink = useInkStore((s) => s.ink);

  // Pin state
  const pins = usePinStore((s) => s.pins);
  const setPins = usePinStore((s) => s.setPins);
  const addPin = usePinStore((s) => s.addPin);
  const placingPin = usePinStore((s) => s.placingPin);
  const setPlacingPin = usePinStore((s) => s.setPlacingPin);
  const selectedPin = usePinStore((s) => s.selectedPin);
  const setSelectedPin = usePinStore((s) => s.setSelectedPin);
  const [pinClickCoords, setPinClickCoords] = useState<{ lng: number; lat: number } | null>(null);
  const pinMarkersRef = useRef<maplibregl.Marker[]>([]);

  const userId = user?.id ?? 'anonymous';
  const userName = profile?.userName ?? 'Anonymous';

  // 1) Drawing engine
  const { engineRef, pipelineRef, initWithMap, destroy } = useDrawingEngine({
    userId,
    userName,
  });

  // 2) Sync — 使用 Session Cookie 进行认证，不再需要 access_token
  // Cookie 会自动携带在 WebSocket 升级请求中
  const sessionToken = user?.id ? 'authenticated' : '';

  const { joinRoom, loadViewport } = useSync({
    engine,
    userId,
    accessToken: sessionToken,
  });

  // 3) Viewport change → load strokes + pins
  const handleViewportChange = useCallback(
    async (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }, zoom: number) => {
      const center = {
        lat: (bounds.minLat + bounds.maxLat) / 2,
        lng: (bounds.minLng + bounds.maxLng) / 2,
      };
      joinRoom(center.lat, center.lng);
      await loadViewport(bounds, zoom);

      // Load pins when zoomed in enough
      if (zoom >= MIN_PIN_ZOOM) {
        try {
          const qs = `minLat=${bounds.minLat}&maxLat=${bounds.maxLat}&minLng=${bounds.minLng}&maxLng=${bounds.maxLng}`;
          const res = await fetch(`/api/pins?${qs}`);
          if (res.ok) {
            const data: MapPin[] = await res.json();
            setPins(data);
          }
        } catch (e) {
          console.error('[MapCanvas] Failed to load pins:', e);
        }
      } else {
        setPins([]);
      }
    },
    [joinRoom, loadViewport, setPins]
  );

  useViewport({
    engine,
    onViewportChange: handleViewportChange,
  });

  // 4) Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Restore last viewport position from localStorage, fallback to defaults
    const saved = getSavedViewport();
    const initialCenter = saved?.center ?? MAP_DEFAULT_CENTER;
    const initialZoom = saved?.zoom ?? MAP_DEFAULT_ZOOM;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: initialCenter,
      zoom: initialZoom,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    mapRef.current = map;

    // Persist viewport position on move
    map.on('moveend', () => {
      saveViewport(map.getCenter(), map.getZoom());
    });

    // Track zoom for UI hint
    map.on('zoom', () => {
      setCurrentZoom(map.getZoom());
    });

    map.on('load', () => {
      setMapReady(true);
    });

    return () => {
      destroy();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 5) Init drawing engine when map is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || !mapContainerRef.current) return;
    if (engineRef.current) return; // already init

    // 使用 map.getContainer() 而不是 getCanvasContainer()
    // 因为 getCanvasContainer() 的高度为 0（MapLibre 内部实现细节）
    const mapContainer = mapRef.current.getContainer();
    initWithMap(mapRef.current, mapContainer);

    // Publish engine to state so useSync/useViewport can react to it
    setEngine(engineRef.current);
  }, [mapReady, initWithMap, engineRef]);

  // 6) Load initial viewport after engine + sync are ready
  //    (runs after useSync creates SyncManager in the same render cycle)
  useEffect(() => {
    if (!engine) return;
    const bounds = engine.viewport.getBounds();
    const zoom = engine.viewport.zoom;
    handleViewportChange(bounds, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // 7) Render pin markers on the map when pins change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous markers
    pinMarkersRef.current.forEach((m) => m.remove());
    pinMarkersRef.current = [];

    if (currentZoom < MIN_PIN_ZOOM) return;

    pins.forEach((pin) => {
      // Create a pin-shaped DOM element
      const el = document.createElement('div');
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50% 50% 50% 0';
      el.style.backgroundColor = pin.color;
      el.style.transform = 'rotate(-45deg)';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.15s';
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'rotate(-45deg) scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'rotate(-45deg)';
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPin(pin);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
      pinMarkersRef.current.push(marker);
    });
  }, [pins, currentZoom, setSelectedPin]);

  // 8) Handle pin placement: listen for map clicks when in pin-placing mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!placingPin) {
      setPinClickCoords(null);
      return;
    }

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      setPinClickCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };

    map.on('click', handleClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = '';
      }
    };
  }, [placingPin]);

  // Pin confirm handler
  const handlePinConfirm = useCallback(
    async (message: string, color: string) => {
      if (!pinClickCoords) return;

      // Consume ink via InkManager if available
      if (engineRef.current?.inkManager) {
        const ok = engineRef.current.inkManager.consume(PIN_INK_COST);
        if (!ok) return; // not enough ink
      }

      try {
        const res = await fetch('/api/pins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lng: pinClickCoords.lng,
            lat: pinClickCoords.lat,
            message,
            color,
          }),
        });
        if (res.ok) {
          const newPin: MapPin = await res.json();
          addPin(newPin);
        }
      } catch (e) {
        console.error('[MapCanvas] Failed to create pin:', e);
      }

      setPinClickCoords(null);
      setPlacingPin(false);
    },
    [pinClickCoords, engineRef, addPin, setPlacingPin]
  );

  const handlePinCancel = useCallback(() => {
    setPinClickCoords(null);
    setPlacingPin(false);
  }, [setPlacingPin]);

  return (
    <div className="relative h-full w-full">
      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="h-full w-full"
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Ink depleted warning */}
      {showLowInkWarning && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
          墨水耗尽，请稍等片刻…
        </div>
      )}

      {/* Zoom hint: show when drawing mode is on but zoom is too low */}
      {drawingMode && currentZoom < MIN_DRAW_ZOOM && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-yellow-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
          请放大到 {MIN_DRAW_ZOOM} 级以上才能绘画（当前 {Math.floor(currentZoom)} 级）
        </div>
      )}

      {/* Zoom hint for pin placement */}
      {placingPin && currentZoom < MIN_PIN_ZOOM && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-yellow-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
          请放大到 {MIN_PIN_ZOOM} 级以上才能放置图钉（当前 {Math.floor(currentZoom)} 级）
        </div>
      )}

      {/* Pin placement prompt */}
      {placingPin && currentZoom >= MIN_PIN_ZOOM && !pinClickCoords && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-primary/90 px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg backdrop-blur-sm">
          点击地图选择图钉位置
        </div>
      )}

      {/* PinPlacer dialog — shown after clicking a location */}
      {pinClickCoords && (
        <PinPlacer
          lng={pinClickCoords.lng}
          lat={pinClickCoords.lat}
          ink={ink}
          onConfirm={handlePinConfirm}
          onCancel={handlePinCancel}
        />
      )}

      {/* PinPopup — shown when clicking an existing pin */}
      {selectedPin && (
        <PinPopup
          pin={selectedPin}
          onClose={() => setSelectedPin(null)}
        />
      )}

      {/* Sync status indicator */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur-sm">
        <span
          className={`h-2 w-2 rounded-full ${
            syncState === 'connected'
              ? 'bg-green-500'
              : syncState === 'connecting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
          }`}
        />
        <span className="text-muted-foreground">
          {syncState === 'connected'
            ? '已连接'
            : syncState === 'connecting'
              ? '连接中...'
              : '离线'}
        </span>
      </div>
    </div>
  );
}
