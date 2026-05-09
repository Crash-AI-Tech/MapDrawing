import { validateSession } from '@/lib/auth/session';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';

const VALID_TYPES = ['pin', 'drawing', 'user'] as const;

/**
 * POST /api/report — submit a content report.
 *
 * Body: { contentId: string, type: 'user' | 'pin' | 'drawing', reason: string }
 *
 * Persists to D1 `reports` table for admin moderation.
 */
export async function POST(request: Request) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    const result = await validateSession();
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkRateLimit(`report:${result.user.id}`, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const body = (await request.json()) as {
      contentId?: string;
      type?: string;
      reason?: string;
    };

    if (!body.contentId || !body.type || !body.reason) {
      return Response.json(
        { error: 'Missing required fields: contentId, type, reason' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(body.type as typeof VALID_TYPES[number])) {
      return Response.json(
        { error: 'Invalid type. Must be one of: pin, drawing, user' },
        { status: 400 }
      );
    }

    if (body.reason.length > 500) {
      return Response.json(
        { error: 'Reason must be 500 characters or less' },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO reports (id, reporter_id, content_id, content_type, reason)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, result.user.id, body.contentId, body.type, body.reason).run();

    return Response.json({ ok: true, id });
  } catch (e) {
    console.error('[API /report POST]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
