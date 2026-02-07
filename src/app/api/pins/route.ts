import { getRequestContext } from '@cloudflare/next-on-pages';
import { validateSession } from '@/lib/auth/session';
import { v7 as uuidv7 } from 'uuid';

export const runtime = 'edge';

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

  if (minLat === 0 && maxLat === 0 && minLng === 0 && maxLng === 0) {
    return Response.json([]);
  }

  try {
    const { env } = getRequestContext();
    const result = await env.DB.prepare(
      `SELECT id, user_id, user_name, lng, lat, message, color, created_at
       FROM map_pins
       WHERE lat BETWEEN ? AND ?
         AND lng BETWEEN ? AND ?
       ORDER BY created_at DESC
       LIMIT 500`
    )
      .bind(minLat, maxLat, minLng, maxLng)
      .all();

    const pins = (result.results ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      lng: row.lng,
      lat: row.lat,
      message: row.message,
      color: row.color,
      createdAt: row.created_at * 1000, // unix seconds → ms
    }));

    return Response.json(pins);
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
    const result = await validateSession();
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
    const { env } = getRequestContext();

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
