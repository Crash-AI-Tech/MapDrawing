import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession } from '@/lib/auth/session';
import { v7 as uuidv7 } from 'uuid';
import { getBlockedUsers } from '@/lib/db/queries';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';
import { readJsonBody, RequestBodyError } from '@/lib/http/body';
import { isInsufficientInkError, prepareInkConsumption } from '@/lib/ink/server';
import {
  parseCursor,
  parseInteger,
  parseViewport,
  QueryValidationError,
} from '@/lib/http/query';

const MAX_PIN_REQUEST_BYTES = 16 * 1024;
const PIN_INK_COST = 50;

interface PinClusterRow {
  gx: number;
  gy: number;
  count: number;
  lng: number;
  lat: number;
  created_at_ms: number;
}

interface PinRow {
  id: string;
  user_id: string | null;
  user_name: string;
  lng: number;
  lat: number;
  message: string;
  color: string;
  created_at: number;
  created_at_ms: number | null;
}

/**
 * GET /api/pins — fetch pins within a viewport bounds.
 * Query params: minLat, maxLat, minLng, maxLng
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const { minLat, maxLat, minLng, maxLng } = parseViewport(url.searchParams, 5);
    const zoomRaw = url.searchParams.get('zoom') ?? '0';
    const zoom = Number(zoomRaw);
    if (!Number.isFinite(zoom) || zoom < 0 || zoom > 24) {
      throw new QueryValidationError('zoom must be between 0 and 24');
    }
    const limit = parseInteger(url.searchParams, 'limit', 200, 1, 500);
    const cursor = parseCursor(url.searchParams);
    const { env } = getCloudflareContext();
    const database = env.DB.withSession();

    // Low zooms return clustered pins to avoid annotation explosion on mobile
    if (zoom < 21) {
      const clampedLimit = Math.max(10, Math.min(limit, 300));
      const latSpan = Math.max(maxLat - minLat, 0.0001);
      const lngSpan = Math.max(maxLng - minLng, 0.0001);
      const gridSize = zoom >= 20 ? 32 : 24;
      const cellLat = latSpan / gridSize;
      const cellLng = lngSpan / gridSize;

      const result = await database.prepare(
        `SELECT
            CAST((lng - ?1) / ?2 AS INTEGER) AS gx,
            CAST((lat - ?3) / ?4 AS INTEGER) AS gy,
            COUNT(*) AS count,
            AVG(lng) AS lng,
            AVG(lat) AS lat,
            MAX(COALESCE(created_at_ms, created_at * 1000)) AS created_at_ms
         FROM map_pins
         WHERE lat BETWEEN ?5 AND ?6
           AND lng BETWEEN ?7 AND ?8
         GROUP BY gx, gy
         ORDER BY count DESC, created_at_ms DESC
         LIMIT ?9`
      )
        .bind(minLng, cellLng, minLat, cellLat, minLat, maxLat, minLng, maxLng, clampedLimit)
        .all<PinClusterRow>();

      const items = (result.results ?? []).map((row) => ({
        type: 'cluster' as const,
        id: `cluster-${row.gx}-${row.gy}`,
        lng: Number(row.lng),
        lat: Number(row.lat),
        count: Number(row.count),
      }));

      return Response.json(
        { mode: 'clustered' as const, items, nextCursor: null },
        { headers: { 'x-d1-bookmark': database.getBookmark() ?? '' } },
      );
    }

    const clampedLimit = Math.max(10, Math.min(limit, 500));
    const pageSize = clampedLimit + 1;
    let query = `SELECT id, user_id, user_name, lng, lat, message, color,
                        created_at, created_at_ms
       FROM map_pins
       WHERE lat BETWEEN ?1 AND ?2
         AND lng BETWEEN ?3 AND ?4`;

    const binds: Array<string | number> = [minLat, maxLat, minLng, maxLng];

    if (cursor) {
      query += `
         AND (
           COALESCE(created_at_ms, created_at * 1000) < ?5
           OR (COALESCE(created_at_ms, created_at * 1000) = ?5 AND id < ?6)
         )
       ORDER BY COALESCE(created_at_ms, created_at * 1000) DESC, id DESC
       LIMIT ?7`;
      binds.push(cursor.createdAt, cursor.id, pageSize);
    } else {
      query += `
       ORDER BY COALESCE(created_at_ms, created_at * 1000) DESC, id DESC
       LIMIT ?5`;
      binds.push(pageSize);
    }

    const result = await database.prepare(query).bind(...binds).all<PinRow>();
    const allRows = result.results ?? [];
    const hasMore = allRows.length > clampedLimit;
    const rows = hasMore ? allRows.slice(0, clampedLimit) : allRows;

    // Filter out pins from blocked users if authenticated (gracefully degrade if table not yet migrated)
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
    const filteredRows = blockedIds.length > 0
      ? rows.filter((r) => !r.user_id || !blockedIds.includes(r.user_id))
      : rows;

    const items = filteredRows.map((row) => ({
      type: 'pin' as const,
      id: row.id,
      userId: row.user_id ?? '',
      userName: row.user_name,
      lng: row.lng,
      lat: row.lat,
      message: row.message,
      color: row.color,
      createdAt: row.created_at_ms ?? row.created_at * 1000,
    }));

    const last = rows[rows.length - 1];
    const nextCursor = hasMore && last
      ? { createdAt: last.created_at_ms ?? last.created_at * 1000, id: last.id }
      : null;

    return Response.json(
      { mode: 'raw' as const, items, nextCursor },
      { headers: { 'x-d1-bookmark': database.getBookmark() ?? '' } },
    );
  } catch (e) {
    if (e instanceof QueryValidationError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    console.error('[API /pins GET] Error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/pins — create a new map pin.
 * Body: { lng, lat, message, color }
 */
export async function POST(request: Request) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 30 pins per minute per user
    const rl = await checkRateLimit(`pins:POST:${result.user.id}`, 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const body = await readJsonBody(request, MAX_PIN_REQUEST_BYTES);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { lng, lat, message, color } = body as {
      lng: number;
      lat: number;
      message: string;
      color: string;
    };

    // Validate
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
    }
    if (!isFinite(lng) || !isFinite(lat) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return Response.json({ error: 'Coordinates out of range' }, { status: 400 });
    }
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 50) {
      return Response.json({ error: 'Message too long (max 50 chars)' }, { status: 400 });
    }
    // Validate color format (hex only)
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return Response.json({ error: 'Invalid color format' }, { status: 400 });
    }

    const id = uuidv7();
    const { env } = getCloudflareContext();
    const nowMs = Date.now();
    const nowSeconds = Math.floor(nowMs / 1000);

    const batchResults = await env.DB.batch([
      prepareInkConsumption(env.DB, result.user.id, PIN_INK_COST, nowSeconds),
      env.DB.prepare(
        `INSERT INTO map_pins (
           id, user_id, user_name, lng, lat, message, color,
           created_at, created_at_ms, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
          id,
          result.user.id,
          result.user.userName ?? 'Anonymous',
          lng,
          lat,
          message.trim(),
          color || '#E63946',
          nowSeconds,
          nowMs,
          nowSeconds,
        ),
    ]);
    const inkRow = batchResults[0]?.results?.[0] as { ink?: number } | undefined;

    return Response.json(
      {
        id,
        userId: result.user.id,
        userName: result.user.userName ?? 'Anonymous',
        lng,
        lat,
        message: message.trim(),
        color: color || '#E63946',
        createdAt: nowMs,
        ink: inkRow?.ink,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    if (e instanceof RequestBodyError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    if (isInsufficientInkError(e)) {
      return Response.json({ error: 'Insufficient ink' }, { status: 402 });
    }
    console.error('[API /pins POST] Error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
