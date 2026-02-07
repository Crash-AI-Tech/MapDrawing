import type { ViewState, GeoBounds, CoordinateConverter } from '../types';

export type ViewportChangeListener = (state: ViewState, bounds: GeoBounds) => void;

/**
 * ViewportManager — tracks the current map viewport state.
 * Bridges between the map engine (MapLibre) and the drawing engine.
 * Pure TypeScript, no framework dependencies.
 */
export class ViewportManager {
  private state: ViewState;
  private bounds: GeoBounds;
  private converter: CoordinateConverter | null = null;
  private listeners = new Set<ViewportChangeListener>();

  constructor(initialState?: Partial<ViewState>) {
    this.state = {
      lng: initialState?.lng ?? 116.4074,
      lat: initialState?.lat ?? 39.9042,
      zoom: initialState?.zoom ?? 14,
      bearing: initialState?.bearing ?? 0,
      pitch: initialState?.pitch ?? 0,
    };

    this.bounds = {
      minLng: this.state.lng - 0.01,
      maxLng: this.state.lng + 0.01,
      minLat: this.state.lat - 0.01,
      maxLat: this.state.lat + 0.01,
    };
  }

  /** Set the coordinate converter (provided by map adapter) */
  setConverter(converter: CoordinateConverter): void {
    this.converter = converter;
  }

  /** Update viewport state from map events */
  update(state: Partial<ViewState>): void {
    this.state = { ...this.state, ...state };

    if (this.converter) {
      this.bounds = this.converter.getViewportBounds();
    }

    this.notify();
  }

  /** Get current view state */
  getViewState(): ViewState {
    return { ...this.state };
  }

  /** Get current viewport bounds */
  getBounds(): GeoBounds {
    return { ...this.bounds };
  }

  /** Get current zoom level */
  get zoom(): number {
    return this.state.zoom;
  }

  /** Convert screen coordinates to geographic coordinates */
  screenToGeo(
    screenX: number,
    screenY: number
  ): { lng: number; lat: number } | null {
    if (!this.converter) return null;
    return this.converter.screenToGeo(screenX, screenY);
  }

  /** Convert geographic coordinates to screen coordinates */
  geoToScreen(lng: number, lat: number): { x: number; y: number } | null {
    if (!this.converter) return null;
    return this.converter.geoToScreen(lng, lat);
  }

  /** Calculate pixel size at current zoom (relative to base zoom 18) */
  getPixelSizeAtCurrentZoom(baseSizeAtZoom18: number): number {
    const zoomDiff = this.state.zoom - 18;
    return baseSizeAtZoom18 * Math.pow(2, zoomDiff);
  }

  /** Subscribe to viewport changes */
  subscribe(listener: ViewportChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.state, this.bounds));
  }
}
