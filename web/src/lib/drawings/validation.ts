import { tilesForBounds, type GeoBounds, type StrokePoint } from '@niubi/shared';

export const MAX_DRAWING_REQUEST_BYTES = 1024 * 1024;
export const MAX_STROKES_PER_BATCH = 10;
export const MAX_POINTS_PER_STROKE = 1000;

const MIN_POINTS_PER_STROKE = 2;
const VALID_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const VALID_COLOR = /^#[0-9a-fA-F]{6}$/;
const VALID_BRUSHES = new Set(['pencil', 'eraser']);
const MAX_MERCATOR_LAT = 85.05112878;
const MAX_META_BYTES = 2048;
const TILE_SIZE = 512;
const INK_COST_K = 20;
const INK_ZOOM_BASE = 18;

export interface ValidatedStroke {
  id: string;
  brushId: 'pencil' | 'eraser';
  color: string;
  opacity: number;
  size: number;
  points: StrokePoint[];
  bounds: GeoBounds;
  createdZoom: number;
  meta: Record<string, unknown> | null;
  inkCost: number;
  tiles: Array<{ z: number; x: number; y: number }>;
}

export class StrokeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StrokeValidationError';
  }
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new StrokeValidationError(`${label} must be a finite number`);
  }
  return value;
}

function parsePoint(value: unknown, index: number): StrokePoint {
  if (!value || typeof value !== 'object') {
    throw new StrokeValidationError(`points[${index}] must be an object`);
  }
  const input = value as Record<string, unknown>;
  const x = finiteNumber(input.x, `points[${index}].x`);
  const y = finiteNumber(input.y, `points[${index}].y`);
  const pressure = finiteNumber(input.pressure ?? 0.5, `points[${index}].pressure`);
  const timestamp = finiteNumber(input.timestamp ?? 0, `points[${index}].timestamp`);

  if (x < -180 || x > 180 || y < -MAX_MERCATOR_LAT || y > MAX_MERCATOR_LAT) {
    throw new StrokeValidationError(`points[${index}] is outside Web Mercator bounds`);
  }
  if (pressure < 0 || pressure > 1) {
    throw new StrokeValidationError(`points[${index}].pressure must be between 0 and 1`);
  }
  if (timestamp < 0) {
    throw new StrokeValidationError(`points[${index}].timestamp must be non-negative`);
  }

  return { x, y, pressure, timestamp: Math.trunc(timestamp) };
}

function calculateBounds(points: StrokePoint[]): GeoBounds {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const point of points) {
    minLng = Math.min(minLng, point.x);
    maxLng = Math.max(maxLng, point.x);
    minLat = Math.min(minLat, point.y);
    maxLat = Math.max(maxLat, point.y);
  }

  // At zoom 18 a legitimate stroke cannot span a degree. Keeping a generous
  // bound prevents forged global strokes and avoids the unsupported antimeridian case.
  if (maxLng - minLng > 1 || maxLat - minLat > 1) {
    throw new StrokeValidationError('Stroke geographic span is too large');
  }

  return { minLng, maxLng, minLat, maxLat };
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

function calculateInkCost(points: StrokePoint[], size: number, zoom: number): number {
  const worldSize = TILE_SIZE * 2 ** zoom;
  let pixelDistance = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const dx = lngToWorldX(current.x, worldSize) - lngToWorldX(previous.x, worldSize);
    const dy = latToWorldY(current.y, worldSize) - latToWorldY(previous.y, worldSize);
    pixelDistance += Math.hypot(dx, dy);
  }

  const zoomMultiplier = 2 ** (2 * (INK_ZOOM_BASE - zoom));
  return Math.max(0.05, (size * pixelDistance * zoomMultiplier) / INK_COST_K);
}

export function validateStrokeBatch(input: unknown): ValidatedStroke[] {
  const rawStrokes = Array.isArray(input) ? input : [input];
  if (rawStrokes.length === 0 || rawStrokes.length > MAX_STROKES_PER_BATCH) {
    throw new StrokeValidationError(
      `Batch must contain 1-${MAX_STROKES_PER_BATCH} strokes`,
    );
  }

  const ids = new Set<string>();
  return rawStrokes.map((value, strokeIndex) => {
    if (!value || typeof value !== 'object') {
      throw new StrokeValidationError(`strokes[${strokeIndex}] must be an object`);
    }
    const raw = value as Record<string, unknown>;
    const id = typeof raw.id === 'string' ? raw.id : '';
    if (!VALID_ID.test(id) || ids.has(id)) {
      throw new StrokeValidationError(`strokes[${strokeIndex}].id is invalid or duplicated`);
    }
    ids.add(id);

    const brushId = raw.brushId ?? 'pencil';
    if (typeof brushId !== 'string' || !VALID_BRUSHES.has(brushId)) {
      throw new StrokeValidationError(`strokes[${strokeIndex}].brushId is unsupported`);
    }

    const color = raw.color ?? '#000000';
    if (typeof color !== 'string' || !VALID_COLOR.test(color)) {
      throw new StrokeValidationError(`strokes[${strokeIndex}].color is invalid`);
    }

    const opacity = finiteNumber(raw.opacity ?? 1, `strokes[${strokeIndex}].opacity`);
    const size = finiteNumber(raw.size ?? 1, `strokes[${strokeIndex}].size`);
    const createdZoom = finiteNumber(
      raw.createdZoom ?? INK_ZOOM_BASE,
      `strokes[${strokeIndex}].createdZoom`,
    );

    if (opacity < 0.05 || opacity > 1) {
      throw new StrokeValidationError(`strokes[${strokeIndex}].opacity is out of range`);
    }
    if (size < 0.5 || size > 10) {
      throw new StrokeValidationError(`strokes[${strokeIndex}].size is out of range`);
    }
    if (createdZoom < 18 || createdZoom > 22) {
      throw new StrokeValidationError(`strokes[${strokeIndex}].createdZoom is out of range`);
    }

    if (!Array.isArray(raw.points)) {
      throw new StrokeValidationError(`strokes[${strokeIndex}].points must be an array`);
    }
    if (
      raw.points.length < MIN_POINTS_PER_STROKE ||
      raw.points.length > MAX_POINTS_PER_STROKE
    ) {
      throw new StrokeValidationError(
        `strokes[${strokeIndex}].points must contain ${MIN_POINTS_PER_STROKE}-${MAX_POINTS_PER_STROKE} items`,
      );
    }
    const points = raw.points.map(parsePoint);
    const bounds = calculateBounds(points);
    let tiles: Array<{ z: number; x: number; y: number }>;
    try {
      tiles = tilesForBounds(bounds, 14, 16);
    } catch {
      throw new StrokeValidationError(`strokes[${strokeIndex}] covers too many tiles`);
    }

    let meta: Record<string, unknown> | null = null;
    if (raw.meta != null) {
      if (typeof raw.meta !== 'object' || Array.isArray(raw.meta)) {
        throw new StrokeValidationError(`strokes[${strokeIndex}].meta must be an object`);
      }
      const encodedMeta = JSON.stringify(raw.meta);
      if (new TextEncoder().encode(encodedMeta).byteLength > MAX_META_BYTES) {
        throw new StrokeValidationError(`strokes[${strokeIndex}].meta is too large`);
      }
      meta = raw.meta as Record<string, unknown>;
    }

    return {
      id,
      brushId: brushId as 'pencil' | 'eraser',
      color: color.toUpperCase(),
      opacity,
      size,
      points,
      bounds,
      createdZoom,
      meta,
      inkCost: calculateInkCost(points, size, createdZoom),
      tiles,
    };
  });
}
