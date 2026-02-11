/**
 * R2 文件上传 API
 * 支持用户头像上传
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    const result = await validateSession();
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // 限制文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() ?? 'png';
    const key = `avatars/${result.user.id}/avatar.${ext}`;

    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    return Response.json({ url: `/${key}` });
  } catch (e) {
    console.error('[Upload] Error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
