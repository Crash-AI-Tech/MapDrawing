/**
 * 登录 Server Action
 * 验证邮箱密码 + email_verified 检查，创建 Session
 */
'use server';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { createLucia } from '@/lib/auth/lucia';
import { verifyPassword } from '@/lib/auth/password';
import { cookies } from 'next/headers';
import { generateId } from 'lucia';
import {
  generateVerificationCode,
  sendVerificationEmail,
} from '@/lib/email/resend';

export interface LoginState {
  error?: string;
  /** 需要先验证邮箱 */
  step?: 'verify';
  email?: string;
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

    // 查找用户
    const user = await env.DB.prepare(
      'SELECT id, password_hash, email_verified FROM users WHERE email = ?'
    )
      .bind(email)
      .first<{ id: string; password_hash: string; email_verified: number }>();

    if (!user) {
      return { error: '邮箱或密码错误' };
    }

    // 验证密码
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return { error: '邮箱或密码错误' };
    }

    // 检查邮箱是否已验证
    if (user.email_verified !== 1) {
      // 自动发送验证码
      const code = generateVerificationCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      await env.DB.prepare(
        'DELETE FROM verification_codes WHERE email = ? AND type = ?'
      ).bind(email, 'email_verification').run();

      await env.DB.prepare(
        `INSERT INTO verification_codes (id, user_id, email, code, type, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(generateId(15), user.id, email, code, 'email_verification', expiresAt).run();

      await sendVerificationEmail(env.RESEND_API_KEY, email, code);

      return { step: 'verify', email };
    }

    // 创建 Session
    const lucia = createLucia(env.DB);
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    (await cookies()).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return {}; // success — 客户端会 refreshUser
  } catch (e) {
    console.error('[Login Error]:', e);
    return { error: '登录出错，请稍后重试' };
  }
}
