import type { CoordinateConverter, ViewState, GeoBounds } from '@/core/types';
import type { Map as MaplibreMap } from 'maplibre-gl';

/**
 * MapLibreAdapter — bridges MapLibre GL JS ↔ ViewportManager.
 * Provides coordinate conversion and viewport state tracking.
 */
export class MapLibreAdapter implements CoordinateConverter {
  private map: MaplibreMap;

  constructor(map: MaplibreMap) {
    this.map = map;
  }

  screenToGeo(screenX: number, screenY: number): { lng: number; lat: number } {
    const lngLat = this.map.unproject([screenX, screenY]);
    return { lng: lngLat.lng, lat: lngLat.lat };
  }

  geoToScreen(lng: number, lat: number): { x: number; y: number } {
    const point = this.map.project([lng, lat]);
    return { x: point.x, y: point.y };
  }

  getViewportBounds(): GeoBounds {
    const bounds = this.map.getBounds();
    return {
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
    };
  }

  getViewState(): ViewState {
    const center = this.map.getCenter();
    return {
      lng: center.lng,
      lat: center.lat,
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
    };
  }

  /** Get the underlying MapLibre map instance */
  getMap(): MaplibreMap {
    return this.map;
  }
}
