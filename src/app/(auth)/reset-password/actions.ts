/**
 * 密码重置 Server Actions
 * 1. requestPasswordReset — 发送重置验证码到邮箱
 * 2. resetPassword — 验证码 + 新密码 → 更新密码
 */
'use server';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { hashPassword } from '@/lib/auth/password';
import { generateId } from 'lucia';
import {
  generateVerificationCode,
  sendPasswordResetEmail,
} from '@/lib/email/resend';

export interface ResetRequestState {
  error?: string;
  /** 验证码已发送 */
  step?: 'code';
  email?: string;
}

export interface ResetPasswordState {
  error?: string;
  success?: boolean;
}

/**
 * 请求密码重置 — 发送验证码
 */
export async function requestPasswordReset(
  _prevState: ResetRequestState | null,
  formData: FormData
): Promise<ResetRequestState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();

  if (!email) {
    return { error: '请输入邮箱地址' };
  }

  try {
    const { env } = getRequestContext();

    const user = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    )
      .bind(email)
      .first<{ id: string }>();

    if (!user) {
      // 安全考虑：不暴露邮箱是否存在
      return { step: 'code', email };
    }

    // 频率限制
    const recent = await env.DB.prepare(
      `SELECT created_at FROM verification_codes
       WHERE email = ? AND type = ?
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(email, 'password_reset')
      .first<{ created_at: string }>();

    if (recent) {
      const elapsed = Date.now() - new Date(recent.created_at).getTime();
      if (elapsed < 60_000) {
        return { error: '请等待 60 秒后重试' };
      }
    }

    // 清除旧验证码
    await env.DB.prepare(
      'DELETE FROM verification_codes WHERE email = ? AND type = ?'
    )
      .bind(email, 'password_reset')
      .run();

    // 生成并发送验证码
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await env.DB.prepare(
      `INSERT INTO verification_codes (id, user_id, email, code, type, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(generateId(15), user.id, email, code, 'password_reset', expiresAt)
      .run();

    const emailResult = await sendPasswordResetEmail(
      env.RESEND_API_KEY,
      email,
      code
    );
    if (!emailResult.success) {
      console.error('[Resend Error]:', emailResult.error);
      return { error: '邮件发送失败，请稍后重试' };
    }

    return { step: 'code', email };
  } catch (e) {
    console.error('[Reset Request Error]:', e);
    return { error: '操作失败，请稍后重试' };
  }
}

/**
 * 重置密码 — 验证码 + 新密码
 */
export async function resetPassword(
  _prevState: ResetPasswordState | null,
  formData: FormData
): Promise<ResetPasswordState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const code = (formData.get('code') as string)?.trim();
  const password = formData.get('password') as string;

  if (!email || !code || !password) {
    return { error: '请填写所有字段' };
  }

  if (code.length !== 6) {
    return { error: '验证码为 6 位数字' };
  }

  if (password.length < 6) {
    return { error: '密码至少需要 6 个字符' };
  }

  try {
    const { env } = getRequestContext();

    // 验证验证码
    const record = await env.DB.prepare(
      `SELECT id, user_id, expires_at
       FROM verification_codes
       WHERE email = ? AND type = ? AND code = ?
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(email, 'password_reset', code)
      .first<{ id: string; user_id: string; expires_at: number }>();

    if (!record) {
      return { error: '验证码错误' };
    }

    if (Date.now() > record.expires_at) {
      await env.DB.prepare('DELETE FROM verification_codes WHERE id = ?')
        .bind(record.id)
        .run();
      return { error: '验证码已过期，请重新获取' };
    }

    // 更新密码 + 清除验证码
    const passwordHash = await hashPassword(password);

    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?').bind(
        passwordHash,
        record.user_id
      ),
      env.DB.prepare(
        'DELETE FROM verification_codes WHERE email = ? AND type = ?'
      ).bind(email, 'password_reset'),
    ]);

    return { success: true };
  } catch (e) {
    console.error('[Reset Password Error]:', e);
    return { error: '重置密码失败，请稍后重试' };
  }
}
