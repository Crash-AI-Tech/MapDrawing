/**
 * R2 文件上传 API
 * 支持用户头像上传
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

    // Rate limit: 10 uploads per minute per user
    const rl = await checkRateLimit(`upload:POST:${result.user.id}`, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // 限制文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    // 文件类型白名单
    const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, GIF allowed.' }, { status: 400 });
    }

    const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    if (!ALLOWED_EXTS.has(ext)) {
      return Response.json({ error: 'Invalid file extension' }, { status: 400 });
    }
    const key = `avatars/${result.user.id}/${crypto.randomUUID()}.${ext}`;

    const buffer = await file.arrayBuffer();
    await env.BUCKET.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });

    return Response.json({ url: `/${key}` });
  } catch (e) {
    console.error('[Upload] Error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
