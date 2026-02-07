/**
 * 注册 Server Action
 * 创建用户、哈希密码、创建 Session、设置 Cookie
 * 使用 useActionState 兼容签名: (prevState, formData) => state
 */
'use server';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { createLucia } from '@/lib/auth/lucia';
import { hashPassword } from '@/lib/auth/password';
import { generateId } from 'lucia';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface RegisterState {
  error: string;
}

export async function register(
  _prevState: RegisterState | null,
  formData: FormData
): Promise<RegisterState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const userName = (formData.get('userName') as string)?.trim() || email?.split('@')[0];

  // 验证输入
  if (!email || !password) {
    return { error: '请填写邮箱和密码' };
  }

  if (password.length < 6) {
    return { error: '密码至少需要 6 个字符' };
  }

  try {
    const { env } = getRequestContext();
    const lucia = createLucia(env.DB);

    // 检查邮箱是否已存在
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    if (existing) {
      return { error: '邮箱已被注册' };
    }

    // 检查用户名是否已存在
    const existingName = await env.DB.prepare(
      'SELECT id FROM users WHERE user_name = ?'
    )
      .bind(userName)
      .first();

    if (existingName) {
      return { error: '用户名已被使用' };
    }

    // 创建用户
    const userId = generateId(15);
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      `INSERT INTO users (id, email, user_name, password_hash)
       VALUES (?, ?, ?, ?)`
    )
      .bind(userId, email, userName, passwordHash)
      .run();

    // 创建 Session
    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    (await cookies()).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
  } catch (e) {
    console.error('[Register Error]:', e);
    return { error: '注册出错，请稍后重试' };
  }

  // redirect 必须在 try/catch 外部
  redirect('/canvas');
}
