import { validateSession } from '@/lib/auth/session';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getUserProfile, updateUserProfile, getUserDeletionData, deleteUserAccountData } from '@/lib/db/queries';
import { revokeAppleAuthorization } from '@/lib/auth/apple';
import { validateCsrf } from '@/lib/csrf';

/**
 * GET /api/profile — fetch the current user's profile (D1).
 */
export async function GET(request: Request) {
  try {
    const result = await validateSession(request);
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
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;
    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { userName?: string; avatarUrl?: string };
    const updates: { userName?: string; avatarUrl?: string } = {};

    if (body.userName !== undefined) {
      if (typeof body.userName !== 'string' || body.userName.length < 1 || body.userName.length > 30) {
        return Response.json({ error: 'Username must be 1-30 characters' }, { status: 400 });
      }
      updates.userName = body.userName.trim();
    }
    if (body.avatarUrl !== undefined) {
      if (typeof body.avatarUrl !== 'string' || !body.avatarUrl.startsWith(`/avatars/${result.user.id}/`)) {
        return Response.json({ error: 'Invalid avatar URL' }, { status: 400 });
      }
      updates.avatarUrl = body.avatarUrl;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    const previousProfile = updates.avatarUrl ? await getUserProfile(result.user.id) : null;
    await updateUserProfile(result.user.id, updates);

    if (updates.avatarUrl && previousProfile?.avatar_url && previousProfile.avatar_url !== updates.avatarUrl) {
      const oldKey = previousProfile.avatar_url.replace(/^\//, '');
      if (oldKey.startsWith(`avatars/${result.user.id}/`)) {
        try {
          const { env } = getCloudflareContext();
          await env.BUCKET.delete(oldKey);
        } catch (error) {
          console.error('[API /profile PATCH]: Failed to delete previous avatar', error);
        }
      }
    }

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

/**
 * DELETE /api/profile — permanently delete the account and associated data.
 */
export async function DELETE(request: Request) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;
    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { env } = getCloudflareContext();
    const deletionData = await getUserDeletionData(result.user.id);
    if (!deletionData) return Response.json({ error: 'Profile not found' }, { status: 404 });

    // Remove every avatar object, including older uploads with a different extension.
    let cursor: string | undefined;
    do {
      const page = await env.BUCKET.list({ prefix: `avatars/${result.user.id}/`, cursor });
      const keys = page.objects.map((object) => object.key);
      if (keys.length > 0) await env.BUCKET.delete(keys);
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);

    // Apple revocation is best effort: a provider outage must not prevent account deletion.
    if (deletionData.apple_refresh_token) {
      try {
        const revoked = await revokeAppleAuthorization(deletionData.apple_refresh_token, env);
        if (!revoked) console.error('[API /profile DELETE]: Apple authorization revocation was rejected');
      } catch (error) {
        console.error('[API /profile DELETE]: Apple authorization revocation failed', error);
      }
    }

    await deleteUserAccountData(result.user.id);

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[API /profile DELETE]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
