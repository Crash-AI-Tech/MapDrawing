import type { StrokePoint } from './types';

export const MAX_INK = 100;
export const INK_REGEN_AMOUNT = 1;
export const INK_REGEN_INTERVAL_SECONDS = 18;
export const INK_REGEN_INTERVAL_MS = INK_REGEN_INTERVAL_SECONDS * 1000;
export const INK_COST_DIVISOR = 20;
export const INK_ZOOM_BASE = 18;
export const MIN_STROKE_INK_COST = 0.05;

export function clampInk(ink: number): number {
  return Math.max(0, Math.min(MAX_INK, ink));
}
export function calculateInkSegmentCost(
  brushSize: number,
  pixelDistance: number,
  zoom = INK_ZOOM_BASE,
): number {
  if (![brushSize, pixelDistance, zoom].every(Number.isFinite)) return 0;
  const zoomMultiplier = 2 ** (2 * (INK_ZOOM_BASE - zoom));
  return Math.max(0, (brushSize * pixelDistance * zoomMultiplier) / INK_COST_DIVISOR);
}

export function regenerateInk(ink: number, elapsedMs: number): number {
  if (!Number.isFinite(ink) || !Number.isFinite(elapsedMs)) return MAX_INK;
  const ticks = Math.floor(Math.max(0, elapsedMs) / INK_REGEN_INTERVAL_MS);
  return clampInk(ink + ticks * INK_REGEN_AMOUNT);
}

function lngToWorldX(lng: number, worldSize: number): number {
  return ((lng + 180) / 360) * worldSize;
}

function latToWorldY(lat: number, worldSize: number): number {
  const radians = (lat * Math.PI) / 180;
  return (
    (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) /
    2
  ) * worldSize;
}

/** Server-authoritative full stroke cost, expressed in geographic points. */
export function calculateStrokeInkCost(
  points: readonly StrokePoint[],
  brushSize: number,
  zoom: number,
  tileSize = 512,
): number {
  const worldSize = tileSize * 2 ** zoom;
  let pixelDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const dx = lngToWorldX(current.x, worldSize) - lngToWorldX(previous.x, worldSize);
    const dy = latToWorldY(current.y, worldSize) - latToWorldY(previous.y, worldSize);
    pixelDistance += Math.hypot(dx, dy);
  }
  return Math.max(MIN_STROKE_INK_COST, calculateInkSegmentCost(brushSize, pixelDistance, zoom));
}
