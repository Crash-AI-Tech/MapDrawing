import type { DrawEvent, StrokeData } from '../types';

/**
 * Serialize/deserialize DrawEvents for WebSocket transport.
 */

export function serializeEvent(event: DrawEvent): string {
  return JSON.stringify(event);
}

export function deserializeEvent(data: string): DrawEvent | null {
  try {
    const parsed = JSON.parse(data);
    if (!parsed || !parsed.type) return null;

    switch (parsed.type) {
      case 'STROKE_ADD':
      case 'STROKE_DELETE':
      case 'STROKE_UPDATE':
      case 'CURSOR_MOVE':
        return parsed as DrawEvent;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Convert a StrokeData to the DB-friendly flat format.
 */
export function strokeToDbRow(stroke: StrokeData): Record<string, unknown> {
  return {
    id: stroke.id,
    user_id: stroke.userId,
    user_name: stroke.userName,
    brush_id: stroke.brushId,
    color: stroke.color,
    opacity: stroke.opacity,
    size: stroke.size,
    points: stroke.points,
    bounds: `(${stroke.bounds.maxLng},${stroke.bounds.maxLat}),(${stroke.bounds.minLng},${stroke.bounds.minLat})`,
    center_lat: (stroke.bounds.minLat + stroke.bounds.maxLat) / 2,
    center_lng: (stroke.bounds.minLng + stroke.bounds.maxLng) / 2,
    created_zoom: stroke.createdZoom,
    meta: stroke.meta ?? null,
    created_at: new Date(stroke.createdAt).toISOString(),
  };
}

/**
 * Convert a DB row back to StrokeData.
 */
export function dbRowToStroke(row: Record<string, unknown>): StrokeData {
  // Parse bounds string from PostgreSQL BOX format: ((x2,y2),(x1,y1))
  let bounds = { minLng: 0, maxLng: 0, minLat: 0, maxLat: 0 };
  if (typeof row.bounds === 'string') {
    const match = row.bounds.match(
      /\(([^,]+),([^)]+)\),\(([^,]+),([^)]+)\)/
    );
    if (match) {
      bounds = {
        maxLng: parseFloat(match[1]),
        maxLat: parseFloat(match[2]),
        minLng: parseFloat(match[3]),
        minLat: parseFloat(match[4]),
      };
    }
  } else if (row.bounds && typeof row.bounds === 'object') {
    bounds = row.bounds as typeof bounds;
  }

  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: (row.user_name as string) ?? '',
    brushId: (row.brush_id as string) ?? 'pencil',
    color: (row.color as string) ?? '#000000',
    opacity: (row.opacity as number) ?? 1,
    size: (row.size as number) ?? 3,
    points: (row.points as StrokeData['points']) ?? [],
    bounds,
    createdZoom: (row.created_zoom as number) ?? 18,
    createdAt: row.created_at
      ? new Date(row.created_at as string).getTime()
      : Date.now(),
    meta: row.meta as Record<string, unknown> | undefined,
  };
}
