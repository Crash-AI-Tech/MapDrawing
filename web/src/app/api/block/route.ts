import { validateSession } from '@/lib/auth/session';
import { blockUser, unblockUser, getBlockedUsers } from '@/lib/db/queries';

/**
 * GET /api/block — list all users I have blocked.
 * Auth required.
 */
export async function GET(request: Request) {
  try {
    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blocked = await getBlockedUsers(result.user.id);

    return Response.json({
      items: blocked.map((row) => ({
        userId: row.blocked_id,
        userName: row.user_name ?? 'Anonymous',
        avatarUrl: row.avatar_url ?? null,
        blockedAt: row.created_at * 1000,
      })),
    });
  } catch (e) {
    console.error('[API /block GET]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/block — block a user.
 * Body: { blockedId: string }
 * Auth required.
 */
export async function POST(request: Request) {
  try {
    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { blockedId?: string };
    if (!body.blockedId) {
      return Response.json({ error: 'blockedId is required' }, { status: 400 });
    }

    if (body.blockedId === result.user.id) {
      return Response.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    await blockUser(result.user.id, body.blockedId);

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[API /block POST]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/block — unblock a user.
 * Body: { blockedId: string }
 * Auth required.
 */
export async function DELETE(request: Request) {
  try {
    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { blockedId?: string };
    if (!body.blockedId) {
      return Response.json({ error: 'blockedId is required' }, { status: 400 });
    }

    await unblockUser(result.user.id, body.blockedId);

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[API /block DELETE]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
