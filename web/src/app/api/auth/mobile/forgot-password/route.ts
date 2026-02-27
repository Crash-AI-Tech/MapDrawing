import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
function generateId(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(x => chars[x % chars.length]).join('');
}
import {
    generateVerificationCode,
    sendPasswordResetEmail,
} from '@/lib/email/resend';

/**
 * POST /api/auth/mobile/forgot-password
 * Send password reset verification code to email.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json() as { email?: string };
        const email = body.email?.trim().toLowerCase();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const { env } = getCloudflareContext();

        const user = await env.DB.prepare(
            'SELECT id FROM users WHERE email = ?'
        ).bind(email).first<{ id: string }>();

        if (!user) {
            // Security: don't reveal if email exists
            return NextResponse.json({ step: 'code', email });
        }

        // Rate limit
        const recent = await env.DB.prepare(
            `SELECT created_at FROM verification_codes
       WHERE email = ? AND type = ?
       ORDER BY created_at DESC LIMIT 1`
        ).bind(email, 'password_reset').first<{ created_at: string }>();

        if (recent) {
            const elapsed = Date.now() - new Date(recent.created_at).getTime();
            if (elapsed < 60_000) {
                return NextResponse.json({ error: 'Please wait 60 seconds before retrying' }, { status: 429 });
            }
        }

        // Clear old codes
        await env.DB.prepare(
            'DELETE FROM verification_codes WHERE email = ? AND type = ?'
        ).bind(email, 'password_reset').run();

        // Generate and send code
        const code = generateVerificationCode();
        const expiresAt = Date.now() + 10 * 60 * 1000;

        await env.DB.prepare(
            `INSERT INTO verification_codes (id, user_id, email, code, type, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(generateId(15), user.id, email, code, 'password_reset', expiresAt).run();

        const emailResult = await sendPasswordResetEmail(env.RESEND_API_KEY, email, code);
        if (!emailResult.success) {
            console.error('[Resend Error]:', emailResult.error);
            return NextResponse.json({ error: `Failed to send email: ${emailResult.error}` }, { status: 400 });
        }

        return NextResponse.json({ step: 'code', email });
    } catch (e) {
        console.error('[Mobile Forgot Password Error]:', e);
        return NextResponse.json({ error: 'Request failed' }, { status: 500 });
    }
}
