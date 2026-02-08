import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession } from '@/lib/auth/session';
import { getDrawingsInViewport } from '@/lib/db/queries';

/**
 * GET /api/drawings — fetch strokes within a viewport bounds (D1).
 * Query params: minLat, maxLat, minLng, maxLng
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const minLat = parseFloat(url.searchParams.get('minLat') ?? '0');
  const maxLat = parseFloat(url.searchParams.get('maxLat') ?? '0');
  const minLng = parseFloat(url.searchParams.get('minLng') ?? '0');
  const maxLng = parseFloat(url.searchParams.get('maxLng') ?? '0');

  if (minLat === 0 && maxLat === 0 && minLng === 0 && maxLng === 0) {
    return Response.json([]);
  }

  try {
    const rows = await getDrawingsInViewport(minLat, maxLat, minLng, maxLng);

    // Transform DB rows to StrokeData format
    const strokes = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
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
      createdAt: row.created_at * 1000, // unix seconds → ms
      meta: row.meta ? JSON.parse(row.meta) : null,
    }));

    return Response.json(strokes);
  } catch (e) {
    console.error('[API /drawings] Server error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/drawings — persist new strokes (batch insert to D1).
 */
export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    // 验证 Session
    const result = await validateSession();
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // 支持单条和批量
    const strokes = Array.isArray(body) ? body : [body];

    const stmt = env.DB.prepare(
      `INSERT INTO drawings (id, user_id, user_name, brush_id, color, opacity, size,
                             points, min_lat, max_lat, min_lng, max_lng,
                             center_lat, center_lng, created_zoom, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const batch = strokes.map((s: any) =>
      stmt.bind(
        s.id,
        result.user.id,
        s.userName ?? result.user.userName ?? 'Unknown',
        s.brushId ?? 'pencil',
        s.color ?? '#000000',
        s.opacity ?? 1.0,
        s.size ?? 1.0,
        typeof s.points === 'string' ? s.points : JSON.stringify(s.points),
        s.bounds?.minLat ?? 0,
        s.bounds?.maxLat ?? 0,
        s.bounds?.minLng ?? 0,
        s.bounds?.maxLng ?? 0,
        ((s.bounds?.minLat ?? 0) + (s.bounds?.maxLat ?? 0)) / 2,
        ((s.bounds?.minLng ?? 0) + (s.bounds?.maxLng ?? 0)) / 2,
        s.createdZoom ?? 14,
        s.meta ? JSON.stringify(s.meta) : null
      )
    );

    await env.DB.batch(batch);

    return Response.json(
      { ok: true, count: strokes.length },
      { status: 201 }
    );
  } catch (e) {
    console.error('[API /drawings POST] Server error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
