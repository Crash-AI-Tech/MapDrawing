/**
 * MercatorProjection — synchronous geo ↔ screen coordinate conversion.
 *
 * Uses Web Mercator (EPSG:3857) math to convert between geographic
 * coordinates and screen pixel positions. This avoids the async overhead
 * of React Native's native bridge calls, enabling real-time rendering.
 *
 * Supports bearing (rotation) but not pitch (tilt).
 */

const TILE_SIZE = 512;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Base zoom for world coordinates (high enough for precision)
export const BASE_ZOOM = 14;
const BASE_WORLD_SIZE = TILE_SIZE * Math.pow(2, BASE_ZOOM);

export class MercatorProjection {
  private centerLng = 0;
  private centerLat = 0;
  private zoom = 14;
  private screenWidth = 0;
  private screenHeight = 0;
  private bearing = 0;

  // Precomputed values
  private worldSize = 0;
  private centerMercX = 0;
  private centerMercY = 0;
  private cosB = 1;
  private sinB = 0;

  /**
   * Update the projection parameters.
   * Call this whenever the map camera or screen size changes.
   */
  update(
    center: [number, number],
    zoom: number,
    screenWidth: number,
    screenHeight: number,
    bearing = 0
  ): void {
    this.centerLng = center[0];
    this.centerLat = center[1];
    this.zoom = zoom;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.bearing = bearing;

    this.worldSize = TILE_SIZE * Math.pow(2, zoom);
    this.centerMercX = this.lngToMercX(center[0]);
    this.centerMercY = this.latToMercY(center[1]);

    const bearingRad = bearing * DEG2RAD;
    // Invert bearing to match MapLibre's rotation direction
    this.cosB = Math.cos(-bearingRad);
    this.sinB = Math.sin(-bearingRad);
  }

  /** Convert geographic coordinate to screen position */
  geoToScreen(lng: number, lat: number): { x: number; y: number } {
    const mercX = this.lngToMercX(lng);
    const mercY = this.latToMercY(lat);

    let dx = mercX - this.centerMercX;
    let dy = mercY - this.centerMercY;

    // Apply bearing rotation
    if (this.bearing !== 0) {
      const rx = dx * this.cosB - dy * this.sinB;
      const ry = dx * this.sinB + dy * this.cosB;
      dx = rx;
      dy = ry;
    }

    return {
      x: this.screenWidth / 2 + dx,
      y: this.screenHeight / 2 + dy,
    };
  }

  /** Convert screen position to geographic coordinate */
  screenToGeo(x: number, y: number): { lng: number; lat: number } {
    let dx = x - this.screenWidth / 2;
    let dy = y - this.screenHeight / 2;

    // Reverse bearing rotation
    if (this.bearing !== 0) {
      const rx = dx * this.cosB + dy * this.sinB;
      const ry = -dx * this.sinB + dy * this.cosB;
      dx = rx;
      dy = ry;
    }

    const mercX = this.centerMercX + dx;
    const mercY = this.centerMercY + dy;

    return {
      lng: this.mercXToLng(mercX),
      lat: this.mercYToLat(mercY),
    };
  }

  /** Get the geographic bounds of the current viewport */
  getViewportBounds(): {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  } {
    const tl = this.screenToGeo(0, 0);
    const tr = this.screenToGeo(this.screenWidth, 0);
    const bl = this.screenToGeo(0, this.screenHeight);
    const br = this.screenToGeo(this.screenWidth, this.screenHeight);

    return {
      minLng: Math.min(tl.lng, tr.lng, bl.lng, br.lng),
      maxLng: Math.max(tl.lng, tr.lng, bl.lng, br.lng),
      minLat: Math.min(tl.lat, tr.lat, bl.lat, br.lat),
      maxLat: Math.max(tl.lat, tr.lat, bl.lat, br.lat),
    };
  }

  // ===== Internal Mercator math =====

  private lngToMercX(lng: number): number {
    return ((lng + 180) / 360) * this.worldSize;
  }

  private latToMercY(lat: number): number {
    const latRad = lat * DEG2RAD;
    return (
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
        2) *
      this.worldSize
    );
  }

  private mercXToLng(mercX: number): number {
    return (mercX / this.worldSize) * 360 - 180;
  }

  private mercYToLat(mercY: number): number {
    const n = Math.PI - (2 * Math.PI * mercY) / this.worldSize;
    return RAD2DEG * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  // ===== World Coordinate Helpers for Matrix Transform =====

  /**
   * Convert geographic coordinate to "World Pixel" at BASE_ZOOM.
   * This is used for caching paths that don't change.
   */
  geoToWorld(lng: number, lat: number): { x: number; y: number } {
    const x = ((lng + 180) / 360) * BASE_WORLD_SIZE;
    const latRad = lat * DEG2RAD;
    const y =
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
        2) *
      BASE_WORLD_SIZE;
    return { x, y };
  }

}
