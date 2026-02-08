/**
 * 邮箱验证 Server Action
 * 验证 6 位验证码，验证通过后创建 Session
 */
'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createLucia } from '@/lib/auth/lucia';
import { cookies } from 'next/headers';
import { generateId } from 'lucia';
import {
  generateVerificationCode,
  sendVerificationEmail,
} from '@/lib/email/resend';

export interface VerifyState {
  error?: string;
  success?: boolean;
}

/**
 * 验证邮箱验证码
 */
export async function verifyEmail(
  _prevState: VerifyState | null,
  formData: FormData
): Promise<VerifyState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const code = (formData.get('code') as string)?.trim();

  if (!email || !code) {
    return { error: '请输入验证码' };
  }

  if (code.length !== 6) {
    return { error: '验证码为 6 位数字' };
  }

  try {
    const { env } = getCloudflareContext();

    // 查找有效验证码
    const record = await env.DB.prepare(
      `SELECT id, user_id, code, expires_at
       FROM verification_codes
       WHERE email = ? AND type = ? AND code = ?
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(email, 'email_verification', code)
      .first<{ id: string; user_id: string; code: string; expires_at: number }>();

    if (!record) {
      return { error: '验证码错误' };
    }

    if (Date.now() > record.expires_at) {
      // 过期了，清除
      await env.DB.prepare('DELETE FROM verification_codes WHERE id = ?')
        .bind(record.id)
        .run();
      return { error: '验证码已过期，请重新发送' };
    }

    // 验证通过：更新 email_verified, 删除验证码, 创建 Session
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(
        record.user_id
      ),
      env.DB.prepare(
        'DELETE FROM verification_codes WHERE email = ? AND type = ?'
      ).bind(email, 'email_verification'),
    ]);

    // 创建 Session
    const lucia = createLucia(env.DB);
    const session = await lucia.createSession(record.user_id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    (await cookies()).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return { success: true };
  } catch (e) {
    console.error('[Verify Error]:', e);
    return { error: '验证出错，请稍后重试' };
  }
}

/**
 * 重新发送验证码
 */
export async function resendVerificationCode(
  _prevState: VerifyState | null,
  formData: FormData
): Promise<VerifyState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();

  if (!email) {
    return { error: '邮箱地址无效' };
  }

  try {
    const { env } = getCloudflareContext();

    const user = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ? AND email_verified = 0'
    )
      .bind(email)
      .first<{ id: string }>();

    if (!user) {
      return { error: '用户不存在或已验证' };
    }

    // 频率限制：检查最近 60 秒内是否已发送过
    const recent = await env.DB.prepare(
      `SELECT created_at FROM verification_codes
       WHERE email = ? AND type = ?
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(email, 'email_verification')
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
      .bind(email, 'email_verification')
      .run();

    // 生成并发送新验证码
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await env.DB.prepare(
      `INSERT INTO verification_codes (id, user_id, email, code, type, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(generateId(15), user.id, email, code, 'email_verification', expiresAt)
      .run();

    const emailResult = await sendVerificationEmail(
      env.RESEND_API_KEY,
      email,
      code
    );
    if (!emailResult.success) {
      console.error('[Resend Error]:', emailResult.error);
      return { error: '邮件发送失败，请稍后重试' };
    }

    return { success: true };
  } catch (e) {
    console.error('[Resend Verification Error]:', e);
    return { error: '发送失败，请稍后重试' };
  }
}
