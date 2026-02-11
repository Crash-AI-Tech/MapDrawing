/**
 * Session 管理工具
 * 提供 Server Component / Route Handler / Middleware 中的 Session 验证
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createLucia } from './lucia';
import { cookies } from 'next/headers';

/**
 * 在 Server Component / Route Handler 中验证 Session
 * 注意：Server Component 中不能修改 Cookie，因此不做 Session 刷新和清除操作
 * Cookie 刷新在 middleware 或 Server Action 中处理
 */
export async function validateSession() {
  try {
    const { env } = getCloudflareContext();
    const lucia = createLucia(env.DB);

    const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value;
    if (!sessionId) {
      return null;
    }

    const { session, user } = await lucia.validateSession(sessionId);

    if (!session) {
      return null;
    }

    return { session, user };
  } catch (e) {
    console.error('[validateSession] Error:', e);
    return null;
  }
}

/**
 * 在 Route Handler 中通过 Request 对象验证 Session
 * 适用于不方便使用 cookies() 的场景（如 Durable Object Token 验证）
 */
export async function validateSessionForRequest(
  request: Request,
  db: D1Database
) {
  const lucia = createLucia(db);

  const cookieHeader = request.headers.get('Cookie');
  const sessionId = lucia.readSessionCookie(cookieHeader ?? '');
  if (!sessionId) return null;

  const { session, user } = await lucia.validateSession(sessionId);
  if (!session) return null;

  return { session, user };
}
