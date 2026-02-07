import { validateSession } from '@/lib/auth/session';
import { getUserProfile, updateUserProfile } from '@/lib/db/queries';

export const runtime = 'edge';

/**
 * GET /api/profile — fetch the current user's profile (D1).
 */
export async function GET() {
  try {
    const result = await validateSession();
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getUserProfile(result.user.id);

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    return Response.json({
      id: profile.id,
      email: result.user.email,
      user_name: profile.user_name,
      avatar_url: profile.avatar_url,
    });
  } catch (e) {
    console.error('[API /profile GET]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/profile — update the current user's profile (D1).
 */
export async function PATCH(request: Request) {
  try {
    const result = await validateSession();
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { userName?: string; avatarUrl?: string };
    const updates: { userName?: string; avatarUrl?: string } = {};

    if (body.userName !== undefined) updates.userName = body.userName;
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    await updateUserProfile(result.user.id, updates);

    const profile = await getUserProfile(result.user.id);

    return Response.json({
      id: profile?.id,
      user_name: profile?.user_name,
      avatar_url: profile?.avatar_url,
    });
  } catch (e) {
    console.error('[API /profile PATCH]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
