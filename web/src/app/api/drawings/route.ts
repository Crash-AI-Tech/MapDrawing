import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession } from '@/lib/auth/session';
import { getDrawingsInViewportPaginated, getBlockedUsers } from '@/lib/db/queries';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';
import { readJsonBody, RequestBodyError } from '@/lib/http/body';
import {
  MAX_DRAWING_REQUEST_BYTES,
  StrokeValidationError,
  validateStrokeBatch,
} from '@/lib/drawings/validation';
import { isInsufficientInkError, prepareInkConsumption } from '@/lib/ink/server';
import {
  parseCursor,
  parseInteger,
  parseViewport,
  QueryValidationError,
} from '@/lib/http/query';

/**
 * GET /api/drawings — fetch strokes within a viewport bounds (D1).
 * Query params: minLat, maxLat, minLng, maxLng
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const { minLat, maxLat, minLng, maxLng } = parseViewport(url.searchParams, 2);
    // Older released clients request 1,000 (iOS) or 5,000 (Web). Accept those
    // values during the synchronized rollout; the query helper still caps one
    // response page at 1,000 rows to protect D1 and Worker memory.
    const limit = parseInteger(url.searchParams, 'limit', 300, 1, 5000);
    const cursor = parseCursor(url.searchParams);
    const { env } = getCloudflareContext();
    const database = env.DB.withSession();
    // Optionally get blocked users if authenticated (gracefully degrade if table not yet migrated)
    let blockedIds: string[] = [];
    try {
      const sessionResult = await validateSession(request).catch(() => null);
      if (sessionResult) {
        const blockedRows = await getBlockedUsers(sessionResult.user.id);
        blockedIds = blockedRows.map((r) => r.blocked_id);
      }
    } catch {
      // blocked_users table may not exist in local dev — skip filtering
    }

    const { rows, nextCursor } = await getDrawingsInViewportPaginated(
      minLat,
      maxLat,
      minLng,
      maxLng,
      {
        limit,
        cursor,
      },
      database,
    );

    // Filter out drawings from blocked users
    const filteredRows = blockedIds.length > 0
      ? rows.filter((r) => !r.user_id || !blockedIds.includes(r.user_id))
      : rows;

    // Transform DB rows to StrokeData format
    const strokes = filteredRows.map((row) => ({
      id: row.id,
      userId: row.user_id ?? '',
      userName: row.user_name ?? 'Unknown',
      brushId: row.brush_id,
      color: row.color,
      opacity: row.opacity,
      size: row.size,
      points:
        typeof row.points === 'string' ? JSON.parse(row.points) : row.points,
      bounds: {
        minLng: row.min_lng,
        maxLng: row.max_lng,
        minLat: row.min_lat,
        maxLat: row.max_lat,
      },
      createdZoom: row.created_zoom,
      createdAt: row.created_at_ms ?? row.created_at * 1000,
      meta: row.meta ? JSON.parse(row.meta) : null,
    }));

    return Response.json(
      { items: strokes, nextCursor },
      { headers: { 'x-d1-bookmark': database.getBookmark() ?? '' } },
    );
  } catch (e: unknown) {
    if (e instanceof QueryValidationError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    console.error('[API /drawings] Server error:', e);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      .all<{ id: string; user_id: string | null }>();

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
                             center_lat, center_lng, created_zoom, meta,
                             created_at, created_at_ms, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        (stroke.bounds.minLat + stroke.bounds.maxLat) / 2,
        (stroke.bounds.minLng + stroke.bounds.maxLng) / 2,
        stroke.createdZoom,
        stroke.meta ? JSON.stringify(stroke.meta) : null,
        nowSeconds,
        nowMs + index,
        nowSeconds,
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
