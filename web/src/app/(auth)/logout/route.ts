/**
 * 登出 Route Handler
 * 销毁 Lucia Session，清除 Cookie
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createLucia } from '@/lib/auth/lucia';
import { cookies } from 'next/headers';
import { validateCsrf } from '@/lib/csrf';

export async function POST(request: Request) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;
    const { env } = getCloudflareContext();
    const lucia = createLucia(env.DB);

    const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value;

    if (sessionId) {
      await lucia.invalidateSession(sessionId).catch(() => undefined);
    }

    const blankCookie = lucia.createBlankSessionCookie();
    (await cookies()).set(
      blankCookie.name,
      blankCookie.value,
      blankCookie.attributes
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[Logout] Error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
