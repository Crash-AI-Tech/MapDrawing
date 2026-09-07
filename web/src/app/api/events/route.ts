import { getCloudflareContext } from '@opennextjs/cloudflare';
import { PRODUCT_EVENTS } from '@niubi/shared';
import { validateCsrf } from '@/lib/csrf';
import { validateSession } from '@/lib/auth/session';
import { readJsonBody } from '@/lib/http/body';
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limit';
import { activityStatement } from '@/lib/product-metrics';

export async function POST(request: Request) {
  const csrf = validateCsrf(request);
  if (csrf) return csrf;
  try {
    const body = await readJsonBody(request, 1024) as { event?: string; platform?: string; channel?: string };
    if (!body || !PRODUCT_EVENTS.includes(body.event as typeof PRODUCT_EVENTS[number])) return Response.json({ error: 'Invalid event' }, { status: 400 });
    const { env } = getCloudflareContext();
    // A salted daily key is for abuse protection only, not visitor identification.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.AUTH_SECRET}:${new Date().toISOString().slice(0, 10)}:${getClientIP(request)}`));
    const key = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
    const limit = await checkRateLimit(`metrics:${key}`, 60, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);
    const identity = await validateSession(request);
    const platform = body.platform === 'ios' ? 'ios' : 'web';
    const channel = ['shared', 'community', 'search'].includes(body.channel ?? '') ? body.channel! : 'direct';
    const statements = [env.DB.prepare("INSERT INTO product_counters (day,event,platform,channel,count) VALUES (date('now'),?,?,?,1) ON CONFLICT(day,event,platform,channel) DO UPDATE SET count=count+1").bind(body.event, platform, channel)];
    if (identity && body.event === 'canvas_open') statements.push(activityStatement(env.DB, identity.user.id, 'visit'));
    await env.DB.batch(statements);
    return new Response(null, { status: 204 });
  } catch { return Response.json({ error: 'Event unavailable' }, { status: 400 }); }
}
