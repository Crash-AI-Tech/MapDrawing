/**
 * Share API — uploads exported canvas images to R2 for sharing.
 * Returns a public URL.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession } from '@/lib/auth/session';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';

export async function POST(request: Request) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    const { env } = getCloudflareContext();

    const result = await validateSession(request);
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5 shares per minute per user
    const rl = await checkRateLimit(`share:POST:${result.user.id}`, 5, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Limit file size (5MB for exported images)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Only allow PNG/JPEG for exported images
    const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg']);
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json({ error: 'Invalid file type. Only PNG and JPEG allowed.' }, { status: 400 });
    }

    const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
    const id = crypto.randomUUID();
    const key = `shares/${id}.${ext}`;

    const buffer = await file.arrayBuffer();
    await env.BUCKET.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });

    // Build the public share URL
    const origin = new URL(request.url).origin;
    const shareUrl = `${origin}/share/${id}`;

    return Response.json({ url: shareUrl, imageKey: key });
  } catch (e) {
    console.error('[Share] Error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
