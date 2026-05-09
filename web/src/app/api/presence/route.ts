import { validateSession } from '@/lib/auth/session';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Presence API — lightweight KV-based cursor sharing.
 *
 * Each user's cursor is stored in KV with a 15s TTL so stale entries auto-expire.
 * Key format: `presence:{tileKey}:{userId}`
 * Value: JSON { userId, userName, lat, lng, color, ts }
 *
 * GET  /api/presence?lat=...&lng=...  → returns all cursors in the same zoom-10 tile
 * PUT  /api/presence                  → update own cursor position
 */

const PRESENCE_ZOOM = 10;
const PRESENCE_TTL = 15; // seconds

function getTileKey(lat: number, lng: number): string {
  const n = Math.pow(2, PRESENCE_ZOOM);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return `${PRESENCE_ZOOM}/${x}/${y}`;
}

export interface CursorEntry {
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  color: string;
  ts: number;
}

export async function PUT(request: Request) {
  try {
    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      lat?: number;
      lng?: number;
      color?: string;
    };

    if (
      typeof body.lat !== 'number' || typeof body.lng !== 'number' ||
      body.lat < -90 || body.lat > 90 || body.lng < -180 || body.lng > 180
    ) {
      return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const { env } = getCloudflareContext();
    const tileKey = getTileKey(body.lat, body.lng);
    const kvKey = `presence:${tileKey}:${result.user.id}`;

    const entry: CursorEntry = {
      userId: result.user.id,
      userName: result.user.userName ?? 'Anonymous',
      lat: body.lat,
      lng: body.lng,
      color: body.color || '#3b82f6',
      ts: Date.now(),
    };

    await env.CACHE.put(kvKey, JSON.stringify(entry), {
      expirationTtl: PRESENCE_TTL,
    });

    return Response.json({ ok: true, tile: tileKey });
  } catch (e) {
    console.error('[API /presence PUT]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const { env } = getCloudflareContext();
    const tileKey = getTileKey(lat, lng);
    const prefix = `presence:${tileKey}:`;

    const list = await env.CACHE.list({ prefix, limit: 50 });
    const cursors: CursorEntry[] = [];

    // Fetch all values in parallel
    const values = await Promise.all(
      list.keys.map((k) => env.CACHE.get(k.name))
    );

    for (const val of values) {
      if (!val) continue;
      try {
        const entry = JSON.parse(val) as CursorEntry;
        // Exclude self
        if (entry.userId !== result.user.id) {
          cursors.push(entry);
        }
      } catch {
        // skip malformed entries
      }
    }

    return Response.json({ cursors, tile: tileKey });
  } catch (e) {
    console.error('[API /presence GET]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
