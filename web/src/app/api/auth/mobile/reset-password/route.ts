import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { hashPassword } from '@/lib/auth/password';

/**
 * POST /api/auth/mobile/reset-password
 * Verify code + update password.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json() as {
            email?: string;
            code?: string;
            password?: string;
        };

        const email = body.email?.trim().toLowerCase();
        const code = body.code?.trim();
        const password = body.password;

        if (!email || !code || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (code.length !== 6) {
            return NextResponse.json({ error: 'Verification code must be 6 digits' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const { env } = getCloudflareContext();

        // Verify code
        const record = await env.DB.prepare(
            `SELECT id, user_id, expires_at
       FROM verification_codes
       WHERE email = ? AND type = ? AND code = ?
       ORDER BY created_at DESC LIMIT 1`
        ).bind(email, 'password_reset', code)
            .first<{ id: string; user_id: string; expires_at: number }>();

        if (!record) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        if (Date.now() > record.expires_at) {
            await env.DB.prepare('DELETE FROM verification_codes WHERE id = ?')
                .bind(record.id).run();
            return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
        }

        // Update password + clean up codes
        const passwordHash = await hashPassword(password);

        await env.DB.batch([
            env.DB.prepare('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?')
                .bind(passwordHash, record.user_id),
            env.DB.prepare('DELETE FROM verification_codes WHERE email = ? AND type = ?')
                .bind(email, 'password_reset'),
        ]);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[Mobile Reset Password Error]:', e);
        return NextResponse.json({ error: 'Password reset failed' }, { status: 500 });
    }
}
