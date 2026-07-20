/**
 * Resend 邮件发送服务
 * 用于邮箱验证和密码重置
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * 通过 Resend API 发送邮件
 */
export async function sendEmail(
  apiKey: string,
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DrawMaps <noreply@wisebamboo.fun>',
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (data as Record<string, string>)?.message || `Resend API error: ${res.status}`,
      };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * 生成 6 位数字验证码
 */
export function generateVerificationCode(): string {
  const arr = crypto.getRandomValues(new Uint32Array(1));
  return String(arr[0] % 1_000_000).padStart(6, '0');
}

/**
 * 发送邮箱验证码
 */
export async function sendVerificationEmail(
  apiKey: string,
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail(apiKey, {
    to,
    subject: `Map 邮箱验证码: ${code}`,
    html: `
      <div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="font-size:24px;font-weight:700;color:#111;margin:0;">🎨 Map</h1>
          <p style="color:#666;margin-top:8px;font-size:14px;">在真实地图上画画的全球协作平台</p>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#333;margin:0 0 16px;font-size:15px;">你的邮箱验证码是</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111;font-family:monospace;">${code}</div>
          <p style="color:#999;margin:16px 0 0;font-size:13px;">验证码 10 分钟内有效</p>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;margin:0;">如果你没有在 Map 注册账号，请忽略此邮件。</p>
      </div>
    `,
  });
}

/**
 * 发送密码重置验证码
 */
export async function sendPasswordResetEmail(
  apiKey: string,
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail(apiKey, {
    to,
    subject: `Map 密码重置验证码: ${code}`,
    html: `
      <div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="font-size:24px;font-weight:700;color:#111;margin:0;">🎨 Map</h1>
          <p style="color:#666;margin-top:8px;font-size:14px;">密码重置</p>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#333;margin:0 0 16px;font-size:15px;">你的密码重置验证码是</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111;font-family:monospace;">${code}</div>
          <p style="color:#999;margin:16px 0 0;font-size:13px;">验证码 10 分钟内有效</p>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;margin:0;">如果你没有请求重置密码，请忽略此邮件。</p>
      </div>
    `,
  });
}
