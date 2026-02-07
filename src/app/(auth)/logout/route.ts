/**
 * 登出 Route Handler
 * 销毁 Lucia Session，清除 Cookie
 */

import { getRequestContext } from '@cloudflare/next-on-pages';
import { createLucia } from '@/lib/auth/lucia';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST() {
  try {
    const { env } = getRequestContext();
    const lucia = createLucia(env.DB);

    const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value;

    if (sessionId) {
      await lucia.invalidateSession(sessionId);
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
