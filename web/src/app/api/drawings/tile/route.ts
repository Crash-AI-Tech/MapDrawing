import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { DrawingRow } from '@/lib/db/queries';

const TILE_ZOOM = 14;
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 500;

function integerParam(url: URL, name: string): number | null {
  const raw = url.searchParams.get(name);
  if (raw == null || !/^-?\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const z = integerParam(url, 'z');
  const x = integerParam(url, 'x');
  const y = integerParam(url, 'y');
  const requestedLimit = integerParam(url, 'limit') ?? DEFAULT_LIMIT;
  const cursorCreatedAt = integerParam(url, 'cursorCreatedAt');
  const cursorId = url.searchParams.get('cursorId');

  const tileCount = 2 ** TILE_ZOOM;
  if (
    z !== TILE_ZOOM || x == null || y == null ||
    x < 0 || y < 0 || x >= tileCount || y >= tileCount
  ) {
    return Response.json({ error: 'Invalid tile coordinate' }, { status: 400 });
  }
  if (requestedLimit < 1 || requestedLimit > MAX_LIMIT) {
    return Response.json({ error: `limit must be between 1 and ${MAX_LIMIT}` }, { status: 400 });
  }
  if ((cursorCreatedAt == null) !== (cursorId == null)) {
    return Response.json({ error: 'Both cursor fields are required' }, { status: 400 });
  }

  try {
    const { env, ctx } = getCloudflareContext();
    const database = env.DB.withSession();
    const version = await database.prepare('SELECT revision FROM tile_versions WHERE z = ? AND x = ? AND y = ?')
      .bind(z, x, y).first<{ revision: number }>();
    const revision = version?.revision ?? 0;
    const etag = `W/"tile-v3-${z}-${x}-${y}-${revision}-${requestedLimit}-${cursorCreatedAt ?? 0}-${encodeURIComponent(cursorId ?? '')}"`;
    const cacheHeaders = { ETag: etag, 'Cache-Control': 'public, max-age=0, must-revalidate' };
    // Validate the cheap tile version before reading/decoding full point data.
    if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: cacheHeaders });
    const cache = typeof caches === 'undefined' ? undefined : (caches as unknown as { default?: Cache }).default;
    const cacheUrl = new URL(request.url);
    cacheUrl.searchParams.set('_revision', String(revision));
    cacheUrl.searchParams.set('_schema', '3');
    const cacheKey = new Request(cacheUrl.toString());
    const cached = await cache?.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      response.headers.set('Cache-Control', cacheHeaders['Cache-Control']);
      response.headers.set('X-Map-Cache', 'HIT');
      return response;
    }
    const pageSize = requestedLimit + 1;
    let sql = `SELECT d.id, d.created_at_ms, length(d.points) AS point_bytes
      FROM drawing_tiles dt
      JOIN drawings d ON d.id = dt.drawing_id
      WHERE dt.z = ?1 AND dt.x = ?2 AND dt.y = ?3`;
    const bindings: Array<string | number> = [z, x, y];

    if (cursorCreatedAt != null && cursorId) {
      sql += ` AND (
        dt.created_at_ms < ?4
        OR (dt.created_at_ms = ?4 AND dt.drawing_id < ?5)
      )
      ORDER BY dt.created_at_ms DESC, dt.drawing_id DESC
      LIMIT ?6`;
      bindings.push(cursorCreatedAt, cursorId, pageSize);
    } else {
      sql += ` ORDER BY dt.created_at_ms DESC, dt.drawing_id DESC LIMIT ?4`;
      bindings.push(pageSize);
    }

    const result = await database.prepare(sql)
      .bind(...bindings)
      .all<{ id: string; created_at_ms: number; point_bytes: number }>();
    const allRows = result.results ?? [];
    const selected: string[] = [];
    let bytes = 0;
    for (const row of allRows.slice(0, requestedLimit)) {
      if (selected.length && bytes + row.point_bytes > 512_000) break;
      selected.push(row.id); bytes += row.point_bytes;
    }
    const hasMore = allRows.length > selected.length;
    // Read point bodies only after applying a byte budget, not 500 huge strokes.
    const rows = selected.length ? (await database.prepare(
      // D1 allows at most 100 bound parameters. A JSON array keeps a 500-item
      // bounded page to one parameter without splitting session reads.
      `SELECT * FROM drawings WHERE id IN (SELECT value FROM json_each(?)) ORDER BY created_at_ms DESC, id DESC`
    ).bind(JSON.stringify(selected)).all<DrawingRow>()).results ?? [] : [];

    const items = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name ?? 'Anonymous',
      brushId: row.brush_id,
      color: row.color,
      opacity: row.opacity,
      size: row.size,
      points: typeof row.points === 'string' ? JSON.parse(row.points) : row.points,
      bounds: {
        minLng: row.min_lng,
        maxLng: row.max_lng,
        minLat: row.min_lat,
        maxLat: row.max_lat,
      },
      createdZoom: row.created_zoom,
      createdAt: row.created_at_ms,
      meta: row.meta ? JSON.parse(row.meta) : undefined,
    }));
    const last = rows[rows.length - 1];
    const nextCursor = hasMore && last
      ? {
          createdAt: last.created_at_ms,
          id: last.id,
        }
      : null;

    const response = Response.json(
      { items, nextCursor },
      {
        headers: {
          ...cacheHeaders,
          'x-d1-bookmark': database.getBookmark() ?? '',
          'X-Map-Cache': 'MISS',
        },
      },
    );
    if (cache) {
      const stored = response.clone();
      stored.headers.set('Cache-Control', 'public, max-age=86400');
      ctx.waitUntil(cache.put(cacheKey, stored).catch(() => undefined));
    }
    return response;
  } catch (error) {
    console.error('[API /drawings/tile GET]:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
