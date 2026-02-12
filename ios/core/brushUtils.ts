/**
 * Skia path building utilities for each brush type.
 * Mirrors the web version's Canvas2D brush rendering logic using Skia APIs.
 */

import { Skia, type SkPath } from '@shopify/react-native-skia';

// ========================
// Path Builders
// ========================

/**
 * Build a Bézier-smoothed path (for Pencil brush).
 * Uses quadratic Bézier curves through midpoints for smooth lines,
 * matching the web version's PencilBrush.ts algorithm.
 */
export function buildBezierPath(
  points: { x: number; y: number }[]
): SkPath {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;

  path.moveTo(points[0].x, points[0].y);

  if (points.length === 1) return path;

  if (points.length === 2) {
    path.lineTo(points[1].x, points[1].y);
    return path;
  }

  // Line to first midpoint
  const mid0x = (points[0].x + points[1].x) / 2;
  const mid0y = (points[0].y + points[1].y) / 2;
  path.lineTo(mid0x, mid0y);

  // Quadratic Bézier through midpoints (same as web PencilBrush.renderFullStroke)
  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    path.quadTo(curr.x, curr.y, midX, midY);
  }

  // Line to last point
  const last = points[points.length - 1];
  path.lineTo(last.x, last.y);

  return path;
}

/**
 * Build a straight-line path (for Marker, Highlighter, Eraser).
 * Connects points with simple line segments.
 */
export function buildLinearPath(
  points: { x: number; y: number }[]
): SkPath {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;

  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }

  return path;
}

// ========================
// Spray Particle Generation
// ========================

export interface SprayParticle {
  x: number;
  y: number;
  alpha: number;
}

/**
 * Generate spray particles with Gaussian density falloff.
 * Uses deterministic PRNG seeded by stroke ID hash for reproducible rendering
 * (same algorithm as web SprayBrush.ts renderFullStroke).
 */
export function generateSprayParticles(
  points: { x: number; y: number; pressure: number }[],
  radius: number,
  seed: number
): SprayParticle[] {
  const DENSITY = 30;
  const particles: SprayParticle[] = [];

  let s = seed;
  const random = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (const point of points) {
    const count = Math.floor(DENSITY * (point.pressure || 0.5));
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const r = random() * radius;
      const gaussR =
        r * Math.sqrt(-2 * Math.log(Math.max(random(), 0.001)));
      const effectiveR = Math.min(gaussR, radius);
      particles.push({
        x: point.x + Math.cos(angle) * effectiveR,
        y: point.y + Math.sin(angle) * effectiveR,
        alpha: (1 - effectiveR / radius) * 0.6,
      });
    }
  }

  return particles;
}

/**
 * Build Skia paths for spray particles, grouped by alpha buckets
 * for efficient rendering (5 paths instead of thousands of circles).
 */
export function buildSprayPaths(
  particles: SprayParticle[]
): { path: SkPath; alpha: number }[] {
  const ALPHA_BUCKETS = [0.1, 0.25, 0.4, 0.55, 0.7];
  const buckets = new Map<number, SkPath>();

  for (const p of particles) {
    // Find nearest bucket
    let bucketAlpha = ALPHA_BUCKETS[0];
    for (const ba of ALPHA_BUCKETS) {
      if (Math.abs(p.alpha - ba) < Math.abs(p.alpha - bucketAlpha)) {
        bucketAlpha = ba;
      }
    }

    if (!buckets.has(bucketAlpha)) {
      buckets.set(bucketAlpha, Skia.Path.Make());
    }
    buckets.get(bucketAlpha)!.addCircle(p.x, p.y, 0.75);
  }

  return Array.from(buckets.entries()).map(([alpha, path]) => ({
    path,
    alpha,
  }));
}

// ========================
// Utilities
// ========================

/** Hash a string to a positive integer (for deterministic PRNG seed) */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) || 1;
}

/** Generate a simple unique ID (timestamp + random) */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
