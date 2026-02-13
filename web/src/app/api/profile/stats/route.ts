import { validateSession } from '@/lib/auth/session';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * GET /api/profile/stats — return user statistics.
 *
 * Response: { pins: number, drawings: number, views: number }
 */
export async function GET() {
  try {
    const result = await validateSession();
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { env } = getCloudflareContext();
    const userId = result.user.id;

    // Run both counts in parallel via D1 batch
    const [pinResult, drawingResult] = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) as count FROM map_pins WHERE user_id = ?').bind(userId),
      env.DB.prepare('SELECT COUNT(*) as count FROM drawings WHERE user_id = ?').bind(userId),
    ]);

    const pins = (pinResult.results?.[0] as { count: number } | undefined)?.count ?? 0;
    const drawings = (drawingResult.results?.[0] as { count: number } | undefined)?.count ?? 0;

    return Response.json({
      pins,
      drawings,
      views: 0, // placeholder — no view tracking yet
    });
  } catch (e) {
    console.error('[API /profile/stats GET]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
