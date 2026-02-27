/**
 * R2 file serving route.
 * GET /api/files/avatars/userId/avatar.jpg → serves the file from R2.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { env } = getCloudflareContext();
        const { path } = await params;
        const key = path.join('/');

        const object = await env.BUCKET.get(key);

        if (!object) {
            return new Response('Not Found', { status: 404 });
        }

        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(object.body, { headers });
    } catch (e) {
        console.error('[Files] Error:', e);
        return new Response('Internal Server Error', { status: 500 });
    }
}
