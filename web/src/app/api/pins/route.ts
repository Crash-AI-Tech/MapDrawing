import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession } from '@/lib/auth/session';
import { v7 as uuidv7 } from 'uuid';

/**
 * GET /api/pins — fetch pins within a viewport bounds.
 * Query params: minLat, maxLat, minLng, maxLng
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const minLat = parseFloat(url.searchParams.get('minLat') ?? '0');
  const maxLat = parseFloat(url.searchParams.get('maxLat') ?? '0');
  const minLng = parseFloat(url.searchParams.get('minLng') ?? '0');
  const maxLng = parseFloat(url.searchParams.get('maxLng') ?? '0');
  const zoom = parseFloat(url.searchParams.get('zoom') ?? '0');
  const limit = parseInt(url.searchParams.get('limit') ?? '200', 10);
  const cursorCreatedAt = url.searchParams.get('cursorCreatedAt');
  const cursorId = url.searchParams.get('cursorId');

  if (minLat === 0 && maxLat === 0 && minLng === 0 && maxLng === 0) {
    return Response.json([]);
  }

  try {
    const { env } = getCloudflareContext();

    // Low zooms return clustered pins to avoid annotation explosion on mobile
    if (zoom < 21) {
      const clampedLimit = Math.max(10, Math.min(limit, 300));
      const latSpan = Math.max(maxLat - minLat, 0.0001);
      const lngSpan = Math.max(maxLng - minLng, 0.0001);
      const gridSize = zoom >= 20 ? 32 : 24;
      const cellLat = latSpan / gridSize;
      const cellLng = lngSpan / gridSize;

      const result = await env.DB.prepare(
        `SELECT
            CAST((lng - ?1) / ?2 AS INTEGER) AS gx,
            CAST((lat - ?3) / ?4 AS INTEGER) AS gy,
            COUNT(*) AS count,
            AVG(lng) AS lng,
            AVG(lat) AS lat,
            MAX(created_at) AS created_at
         FROM map_pins
         WHERE lat BETWEEN ?5 AND ?6
           AND lng BETWEEN ?7 AND ?8
         GROUP BY gx, gy
         ORDER BY count DESC, created_at DESC
         LIMIT ?9`
      )
        .bind(minLng, cellLng, minLat, cellLat, minLat, maxLat, minLng, maxLng, clampedLimit)
        .all();

      const items = (result.results ?? []).map((row: any) => ({
        type: 'cluster' as const,
        id: `cluster-${row.gx}-${row.gy}`,
        lng: Number(row.lng),
        lat: Number(row.lat),
        count: Number(row.count),
      }));

      return Response.json({
        mode: 'clustered' as const,
        items,
        nextCursor: null,
      });
    }

    const clampedLimit = Math.max(10, Math.min(limit, 500));
    const pageSize = clampedLimit + 1;
    let query = `SELECT id, user_id, user_name, lng, lat, message, color, created_at
       FROM map_pins
       WHERE lat BETWEEN ?1 AND ?2
         AND lng BETWEEN ?3 AND ?4`;

    const binds: Array<string | number> = [minLat, maxLat, minLng, maxLng];

    if (cursorCreatedAt && cursorId) {
      query += `
         AND (created_at < ?5 OR (created_at = ?5 AND id < ?6))
       ORDER BY created_at DESC, id DESC
       LIMIT ?7`;
      binds.push(parseInt(cursorCreatedAt, 10), cursorId, pageSize);
    } else {
      query += `
       ORDER BY created_at DESC, id DESC
       LIMIT ?5`;
      binds.push(pageSize);
    }

    const result = await env.DB.prepare(query).bind(...binds).all();
    const allRows = result.results ?? [];
    const hasMore = allRows.length > clampedLimit;
    const rows = hasMore ? allRows.slice(0, clampedLimit) : allRows;

    const items = rows.map((row: any) => ({
      type: 'pin' as const,
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      lng: row.lng,
      lat: row.lat,
      message: row.message,
      color: row.color,
      createdAt: row.created_at * 1000, // unix seconds → ms
    }));

    const last = rows[rows.length - 1] as any;
    const nextCursor = hasMore && last
      ? { createdAt: last.created_at, id: last.id }
      : null;

    return Response.json({
      mode: 'raw' as const,
      items,
      nextCursor,
    });
  } catch (e) {
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
    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 50) {
      return Response.json({ error: 'Message too long (max 50 chars)' }, { status: 400 });
    }

    const id = uuidv7();
    const { env } = getCloudflareContext();

    await env.DB.prepare(
      `INSERT INTO map_pins (id, user_id, user_name, lng, lat, message, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        result.user.id,
        result.user.userName ?? 'Anonymous',
        lng,
        lat,
        message.trim(),
        color || '#E63946'
      )
      .run();

    return Response.json(
      {
        id,
        userId: result.user.id,
        userName: result.user.userName ?? 'Anonymous',
        lng,
        lat,
        message: message.trim(),
        color: color || '#E63946',
        createdAt: Date.now(),
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[API /pins POST] Error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
