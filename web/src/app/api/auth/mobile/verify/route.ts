import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createLucia } from '@/lib/auth/lucia';
import { generateId } from 'lucia';
import {
    generateVerificationCode,
    sendVerificationEmail,
} from '@/lib/email/resend';

/**
 * POST /api/auth/mobile/verify
 * Verify email with 6-digit code, create session, return token.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json() as {
            email?: string;
            code?: string;
            action?: 'resend'; // if set, resend verification code
        };

        const email = body.email?.trim().toLowerCase();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const { env } = getCloudflareContext();

        // Handle resend action
        if (body.action === 'resend') {
            const user = await env.DB.prepare(
                'SELECT id FROM users WHERE email = ? AND email_verified = 0'
            ).bind(email).first<{ id: string }>();

            if (!user) {
                return NextResponse.json({ error: 'User not found or already verified' }, { status: 400 });
            }

            // Rate limit: check last 60 seconds
            const recent = await env.DB.prepare(
                `SELECT created_at FROM verification_codes
         WHERE email = ? AND type = ?
         ORDER BY created_at DESC LIMIT 1`
            ).bind(email, 'email_verification').first<{ created_at: string }>();

            if (recent) {
                const elapsed = Date.now() - new Date(recent.created_at).getTime();
                if (elapsed < 60_000) {
                    return NextResponse.json({ error: 'Please wait 60 seconds before retrying' }, { status: 429 });
                }
            }

            // Clear old codes and send new one
            await env.DB.prepare(
                'DELETE FROM verification_codes WHERE email = ? AND type = ?'
            ).bind(email, 'email_verification').run();

            const code = generateVerificationCode();
            const expiresAt = Date.now() + 10 * 60 * 1000;

            await env.DB.prepare(
                `INSERT INTO verification_codes (id, user_id, email, code, type, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(generateId(15), user.id, email, code, 'email_verification', expiresAt).run();

            const emailResult = await sendVerificationEmail(env.RESEND_API_KEY, email, code);
            if (!emailResult.success) {
                return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
            }

            return NextResponse.json({ success: true });
        }

        // Verify code
        const code = body.code?.trim();
        if (!code || code.length !== 6) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        const record = await env.DB.prepare(
            `SELECT id, user_id, expires_at
       FROM verification_codes
       WHERE email = ? AND type = ? AND code = ?
       ORDER BY created_at DESC LIMIT 1`
        ).bind(email, 'email_verification', code)
            .first<{ id: string; user_id: string; expires_at: number }>();

        if (!record) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        if (Date.now() > record.expires_at) {
            await env.DB.prepare('DELETE FROM verification_codes WHERE id = ?')
                .bind(record.id).run();
            return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
        }

        // Verify: update user + delete codes + create session
        await env.DB.batch([
            env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?')
                .bind(record.user_id),
            env.DB.prepare('DELETE FROM verification_codes WHERE email = ? AND type = ?')
                .bind(email, 'email_verification'),
        ]);

        const lucia = createLucia(env.DB);
        const session = await lucia.createSession(record.user_id, {});

        // Fetch user for response
        const user = await env.DB.prepare(
            'SELECT id, email, user_name, avatar_url FROM users WHERE id = ?'
        ).bind(record.user_id).first<{ id: string; email: string; user_name: string; avatar_url: string | null }>();

        return NextResponse.json({
            token: session.id,
            user: {
                id: user?.id,
                email: user?.email,
                userName: user?.user_name,
                avatarUrl: user?.avatar_url,
            },
        });
    } catch (e) {
        console.error('[Mobile Verify Error]:', e);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
