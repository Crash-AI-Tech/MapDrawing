import type { GeoBounds } from '@/core/types';

/**
 * Calculate distance between two geographic points (Haversine formula).
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if two bounding boxes overlap.
 */
export function boundsOverlap(a: GeoBounds, b: GeoBounds): boolean {
  return (
    a.minLng <= b.maxLng &&
    a.maxLng >= b.minLng &&
    a.minLat <= b.maxLat &&
    a.maxLat >= b.minLat
  );
}

/**
 * Calculate the center point of a bounding box.
 */
export function boundsCenter(bounds: GeoBounds): { lat: number; lng: number } {
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

/**
 * Expand a bounding box by a percentage margin.
 */
export function expandBounds(bounds: GeoBounds, margin: number = 0.1): GeoBounds {
  const lngRange = bounds.maxLng - bounds.minLng;
  const latRange = bounds.maxLat - bounds.minLat;
  return {
    minLng: bounds.minLng - lngRange * margin,
    maxLng: bounds.maxLng + lngRange * margin,
    minLat: bounds.minLat - latRange * margin,
    maxLat: bounds.maxLat + latRange * margin,
  };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
