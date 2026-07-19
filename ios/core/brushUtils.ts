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
 * Build a straight-line path for the eraser.
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

/** Generate a simple unique ID (timestamp + random) */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
