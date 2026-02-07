/**
 * 登录 Server Action
 * 验证邮箱密码，创建 Lucia Session，设置 Cookie
 * 使用 useActionState 兼容签名: (prevState, formData) => state
 */
'use server';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { createLucia } from '@/lib/auth/lucia';
import { verifyPassword } from '@/lib/auth/password';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface LoginState {
  error: string;
}

export async function login(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: '请填写邮箱和密码' };
  }

  try {
    const { env } = getRequestContext();
    const lucia = createLucia(env.DB);

    // 查找用户
    const user = await env.DB.prepare(
      'SELECT id, password_hash FROM users WHERE email = ?'
    )
      .bind(email)
      .first<{ id: string; password_hash: string }>();

    if (!user) {
      return { error: '邮箱或密码错误' };
    }

    // 验证密码
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return { error: '邮箱或密码错误' };
    }

    // 创建 Session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    (await cookies()).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
  } catch (e) {
    console.error('[Login Error]:', e);
    return { error: '登录出错，请稍后重试' };
  }

  // redirect 必须在 try/catch 外部，因为它内部通过 throw 实现
  redirect('/canvas');
}
