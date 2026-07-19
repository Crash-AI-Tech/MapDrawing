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
    const { env } = getCloudflareContext();
    const database = env.DB.withSession();
    const pageSize = requestedLimit + 1;
    let sql = `SELECT d.*
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
      .all<DrawingRow>();
    const allRows = result.results ?? [];
    const hasMore = allRows.length > requestedLimit;
    const rows = hasMore ? allRows.slice(0, requestedLimit) : allRows;

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

    const firstId = rows[0]?.id ?? 'empty';
    const lastId = last?.id ?? 'empty';
    const etag = `W/"tile-${z}-${x}-${y}-${firstId}-${lastId}-${rows.length}"`;
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          'x-d1-bookmark': database.getBookmark() ?? '',
        },
      });
    }

    return Response.json(
      { items, nextCursor },
      {
        headers: {
          ETag: etag,
          'x-d1-bookmark': database.getBookmark() ?? '',
          'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=120',
        },
      },
    );
  } catch (error) {
    console.error('[API /drawings/tile GET]:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
