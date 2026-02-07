/**
 * 注册 Server Action
 * 创建用户(email_verified=0)，发送验证码邮件
 * 注册后需要验证邮箱才能登录
 */
'use server';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { hashPassword } from '@/lib/auth/password';
import { generateId } from 'lucia';
import {
  generateVerificationCode,
  sendVerificationEmail,
} from '@/lib/email/resend';

export interface RegisterState {
  error?: string;
  /** 注册成功后进入验证步骤 */
  step?: 'verify';
  email?: string;
}

export async function register(
  _prevState: RegisterState | null,
  formData: FormData
): Promise<RegisterState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const userName =
    (formData.get('userName') as string)?.trim() || email?.split('@')[0];

  if (!email || !password) {
    return { error: '请填写邮箱和密码' };
  }
  if (password.length < 6) {
    return { error: '密码至少需要 6 个字符' };
  }

  try {
    const { env } = getRequestContext();

    // 检查邮箱是否已存在
    const existing = await env.DB.prepare(
      'SELECT id, email_verified FROM users WHERE email = ?'
    ).bind(email).first<{ id: string; email_verified: number }>();

    if (existing) {
      if (existing.email_verified === 1) {
        return { error: '邮箱已被注册' };
      }
      // 邮箱已注册但未验证 — 重新发送验证码
      const code = generateVerificationCode();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 分钟

      // 清除旧验证码
      await env.DB.prepare(
        'DELETE FROM verification_codes WHERE email = ? AND type = ?'
      ).bind(email, 'email_verification').run();

      await env.DB.prepare(
        `INSERT INTO verification_codes (id, user_id, email, code, type, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(generateId(15), existing.id, email, code, 'email_verification', expiresAt).run();

      const emailResult = await sendVerificationEmail(env.RESEND_API_KEY, email, code);
      if (!emailResult.success) {
        console.error('[Resend Error]:', emailResult.error);
        return { error: '验证邮件发送失败，请稍后重试' };
      }

      return { step: 'verify', email };
    }

    // 检查用户名
    const existingName = await env.DB.prepare(
      'SELECT id FROM users WHERE user_name = ?'
    ).bind(userName).first();
    if (existingName) {
      return { error: '用户名已被使用' };
    }

    // 创建用户 (email_verified = 0)
    const userId = generateId(15);
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      `INSERT INTO users (id, email, user_name, password_hash, email_verified)
       VALUES (?, ?, ?, ?, 0)`
    ).bind(userId, email, userName, passwordHash).run();

    // 生成验证码并发送
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await env.DB.prepare(
      `INSERT INTO verification_codes (id, user_id, email, code, type, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(generateId(15), userId, email, code, 'email_verification', expiresAt).run();

    const emailResult = await sendVerificationEmail(env.RESEND_API_KEY, email, code);
    if (!emailResult.success) {
      console.error('[Resend Error]:', emailResult.error);
      return { error: '验证邮件发送失败，请稍后重试' };
    }

    return { step: 'verify', email };
  } catch (e) {
    console.error('[Register Error]:', e);
    return { error: '注册出错，请稍后重试' };
  }
}
