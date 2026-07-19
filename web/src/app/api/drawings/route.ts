import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession } from '@/lib/auth/session';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';
import { readJsonBody, RequestBodyError } from '@/lib/http/body';
import {
  MAX_DRAWING_REQUEST_BYTES,
  StrokeValidationError,
  validateStrokeBatch,
} from '@/lib/drawings/validation';
import { isInsufficientInkError, prepareInkConsumption } from '@/lib/ink/server';
/**
 * POST /api/drawings — persist new strokes (batch insert to D1).
 */
export async function POST(request: Request) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    const { env } = getCloudflareContext();

    // 验证 Session (Cookie 或 Bearer token)
    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // A batch contains at most 10 strokes, so this permits at most 300/minute.
    const rl = await checkRateLimit(`drawings:POST:${result.user.id}`, 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const body = await readJsonBody(request, MAX_DRAWING_REQUEST_BYTES);
    const strokes = validateStrokeBatch(body);

    const placeholders = strokes.map(() => '?').join(',');
    const existing = await env.DB.prepare(
      `SELECT id, user_id FROM drawings WHERE id IN (${placeholders})`
    )
      .bind(...strokes.map((stroke) => stroke.id))
      .all<{ id: string; user_id: string }>();

    if ((existing.results?.length ?? 0) > 0) {
      const ownedIds = new Set(
        (existing.results ?? [])
          .filter((row) => row.user_id === result.user.id)
          .map((row) => row.id),
      );
      if (ownedIds.size === strokes.length) {
        return Response.json({ ok: true, count: strokes.length, duplicate: true });
      }
      return Response.json({ error: 'One or more stroke ids already exist' }, { status: 409 });
    }

    const stmt = env.DB.prepare(
      `INSERT INTO drawings (id, user_id, user_name, brush_id, color, opacity, size,
                             points, point_count, min_lat, max_lat, min_lng, max_lng,
                             created_zoom, meta, created_at_ms, updated_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const nowMs = Date.now();
    const nowSeconds = Math.floor(nowMs / 1000);
    const totalInkCost = strokes.reduce((sum, stroke) => sum + stroke.inkCost, 0);
    const inserts = strokes.map((stroke, index) =>
      stmt.bind(
        stroke.id,
        result.user.id,
        result.user.userName ?? 'Unknown',
        stroke.brushId,
        stroke.color,
        stroke.opacity,
        stroke.size,
        JSON.stringify(stroke.points),
        stroke.points.length,
        stroke.bounds.minLat,
        stroke.bounds.maxLat,
        stroke.bounds.minLng,
        stroke.bounds.maxLng,
        stroke.createdZoom,
        stroke.meta ? JSON.stringify(stroke.meta) : null,
        nowMs + index,
        nowMs + index,
      )
    );

    const tileInserts = strokes.map((stroke, strokeIndex) => {
      const values = stroke.tiles.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const bindings = stroke.tiles.flatMap((tile) => [
        tile.z,
        tile.x,
        tile.y,
        stroke.id,
        nowMs + strokeIndex,
      ]);
      return env.DB.prepare(
        `INSERT INTO drawing_tiles (z, x, y, drawing_id, created_at_ms)
         VALUES ${values}`
      ).bind(...bindings);
    });

    const batchResults = await env.DB.batch([
      prepareInkConsumption(env.DB, result.user.id, totalInkCost, nowSeconds),
      ...inserts,
      ...tileInserts,
    ]);
    const inkRow = batchResults[0]?.results?.[0] as { ink?: number } | undefined;

    return Response.json(
      { ok: true, count: strokes.length, ink: inkRow?.ink },
      { status: 201 }
    );
  } catch (e: unknown) {
    if (e instanceof RequestBodyError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof StrokeValidationError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    if (isInsufficientInkError(e)) {
      return Response.json({ error: 'Insufficient ink' }, { status: 402 });
    }
    console.error('[API /drawings POST] Server error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
