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

/** Generate an SVG pin cursor data URI — small size (14x20) */
function pinCursorSvg(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="20" viewBox="0 0 28 40"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="white"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 7 19, pointer`;
}

/** Format a relative time string */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

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
  const drawingMode = useDrawingStore((s) => s.drawingMode);
  const setCurrentZoomGlobal = useUIStore((s) => s.setCurrentZoom);
  const showLowInkWarning = useInkStore((s) => s.showLowInkWarning);
  const ink = useInkStore((s) => s.ink);

  // Pin state
  const pins = usePinStore((s) => s.pins);
  const setPins = usePinStore((s) => s.setPins);
  const addPin = usePinStore((s) => s.addPin);
  const placingPin = usePinStore((s) => s.placingPin);
  const setPlacingPin = usePinStore((s) => s.setPlacingPin);
  const pinColor = usePinStore((s) => s.pinColor);
  const [pinClickCoords, setPinClickCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ lng: number; lat: number } | null>(null);
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

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    mapRef.current = map;

    // Persist viewport position on move
    map.on('moveend', () => {
      saveViewport(map.getCenter(), map.getZoom());
    });

    // Track zoom for UI hint
    map.on('zoom', () => {
      const z = map.getZoom();
      setCurrentZoom(z);
      setCurrentZoomGlobal(z);
    });

    // Track mouse position for coordinate display
    map.on('mousemove', (e) => {
      setMouseCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });
    map.on('mouseout', () => {
      setMouseCoords(null);
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
      // Wrapper container — will be the marker element, anchored at bottom center
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      wrapper.style.cursor = 'pointer';

      // -- Tooltip bubble (always visible, truncated) --
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `
        position: relative;
        background: white;
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 11px;
        line-height: 1.4;
        color: #333;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120px;
        margin-bottom: 4px;
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        transform-origin: bottom center;
        pointer-events: auto;
      `;

      // Truncated message (default view)
      const msgPreview = pin.message.length > 10 ? pin.message.slice(0, 10) + '…' : pin.message;
      tooltip.textContent = msgPreview;

      // Tooltip arrow (tail)
      const arrow = document.createElement('div');
      arrow.style.cssText = `
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid white;
      `;
      tooltip.appendChild(arrow);

      // -- Pin icon --
      const pinEl = document.createElement('div');
      pinEl.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50% 50% 50% 0;
        background-color: ${pin.color};
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        flex-shrink: 0;
        transition: transform 0.2s ease;
        transform-origin: center center;
      `;

      // Hover expand: show full details in tooltip
      wrapper.addEventListener('mouseenter', () => {
        tooltip.style.maxWidth = '200px';
        tooltip.style.whiteSpace = 'normal';
        tooltip.style.wordBreak = 'break-word';
        tooltip.style.transform = 'scale(1.08)';
        tooltip.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        tooltip.innerHTML = '';
        // Full message
        const msgEl = document.createElement('div');
        msgEl.style.cssText = 'font-size:12px;color:#222;margin-bottom:4px;line-height:1.5;';
        msgEl.textContent = pin.message;
        tooltip.appendChild(msgEl);
        // Meta line: author + time
        const metaEl = document.createElement('div');
        metaEl.style.cssText = 'font-size:10px;color:#999;display:flex;justify-content:space-between;gap:8px;';
        metaEl.innerHTML = `<span>${pin.userName || '匿名'}</span><span>${timeAgo(pin.createdAt)}</span>`;
        tooltip.appendChild(metaEl);
        // Re-add arrow
        const hoverArrow = document.createElement('div');
        hoverArrow.style.cssText = arrow.style.cssText;
        tooltip.appendChild(hoverArrow);
      });

      wrapper.addEventListener('mouseleave', () => {
        tooltip.style.maxWidth = '120px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.overflow = 'hidden';
        tooltip.style.textOverflow = 'ellipsis';
        tooltip.style.wordBreak = 'normal';
        tooltip.style.transform = 'scale(1)';
        tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        tooltip.innerHTML = '';
        tooltip.textContent = msgPreview;
        // Re-add arrow
        const leaveArrow = document.createElement('div');
        leaveArrow.style.cssText = arrow.style.cssText;
        tooltip.appendChild(leaveArrow);
      });

      wrapper.appendChild(tooltip);
      wrapper.appendChild(pinEl);

      const marker = new maplibregl.Marker({
        element: wrapper,
        anchor: 'bottom',
      })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
      pinMarkersRef.current.push(marker);
    });
  }, [pins, currentZoom]);

  // 8) Handle pin placement: listen for map clicks when in pin-placing mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!placingPin) {
      setPinClickCoords(null);
      return;
    }

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      // Only allow placement when zoomed in enough
      if (map.getZoom() < MIN_PIN_ZOOM) return;
      setPinClickCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };

    map.on('click', handleClick);
    // Use pin-shaped SVG cursor matching selected color
    map.getCanvas().style.cursor = pinCursorSvg(pinColor);

    return () => {
      map.off('click', handleClick);
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = '';
      }
    };
  }, [placingPin, pinColor]);

  // 9) Pin placement cursor — only show pin cursor when zoomed in enough
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (placingPin && currentZoom >= MIN_PIN_ZOOM) {
      map.getCanvas().style.cursor = pinCursorSvg(pinColor);
    } else {
      map.getCanvas().style.cursor = '';
    }
  }, [drawingMode, placingPin, pinColor, currentZoom]);

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

      {/* Zoom level & mouse coordinates — top left, above MapLibre zoom controls */}
      <div className="absolute top-4 left-3 z-30 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200/60 bg-white/90 px-3 py-2 text-[11px] tabular-nums text-muted-foreground shadow-md backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span className="font-semibold text-foreground">{currentZoom.toFixed(1)}</span>
          </div>
          {mouseCoords && (
            <>
              <span className="h-3 w-px bg-gray-300" />
              <span className="text-gray-500">{mouseCoords.lat.toFixed(5)}, {mouseCoords.lng.toFixed(5)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
