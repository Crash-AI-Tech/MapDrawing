import { validateSession } from '@/lib/auth/session';

/**
 * POST /api/report — submit a content report.
 *
 * Body: { contentId: string, type: 'user' | 'pin', reason: string }
 *
 * For now we just log it server-side. In production, persist to a `reports`
 * table and wire up an admin moderation queue.
 */
export async function POST(request: Request) {
  try {
    const result = await validateSession();
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Log the report (replace with DB insert when reports table is added)
    console.log(
      `[Report] user=${result.user.id} reported ${body.type}/${body.contentId}: ${body.reason}`
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[API /report POST]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
