import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { hashPassword } from '@/lib/auth/password';
// Using custom generateId to avoid Edge runtime module resolution issues with lucia
function generateId(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(x => chars[x % chars.length]).join('');
}
import {
    generateVerificationCode,
    sendVerificationEmail,
} from '@/lib/email/resend';

export async function POST(request: Request) {
    try {
        const body = await request.json() as {
            email?: string;
            password?: string;
            userName?: string;
        };

        const email = body.email?.trim().toLowerCase();
        const password = body.password;
        const userName = body.userName?.trim() || email?.split('@')[0];

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const { env } = getCloudflareContext();

        // Check if email already exists
        const existing = await env.DB.prepare(
            'SELECT id, email_verified FROM users WHERE email = ?'
        ).bind(email).first<{ id: string; email_verified: number }>();

        if (existing) {
            if (existing.email_verified === 1) {
                return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
            }

            // Email registered but not verified — resend verification code
            const code = generateVerificationCode();
            const expiresAt = Date.now() + 10 * 60 * 1000;

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
                return NextResponse.json({ error: `Registration failed: ${emailResult.error}` }, { status: 400 });
            }

            return NextResponse.json({ step: 'verify', email });
        }

        // Check username uniqueness
        if (userName) {
            const existingName = await env.DB.prepare(
                'SELECT id FROM users WHERE user_name = ?'
            ).bind(userName).first();
            if (existingName) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
            }
        }

        // Create user (email_verified = 0)
        const userId = generateId(15);
        const passwordHash = await hashPassword(password);

        await env.DB.prepare(
            `INSERT INTO users (id, email, user_name, password_hash, email_verified)
       VALUES (?, ?, ?, ?, 0)`
        ).bind(userId, email, userName, passwordHash).run();

        // Generate and send verification code
        const code = generateVerificationCode();
        const expiresAt = Date.now() + 10 * 60 * 1000;

        await env.DB.prepare(
            `INSERT INTO verification_codes (id, user_id, email, code, type, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(generateId(15), userId, email, code, 'email_verification', expiresAt).run();

        const emailResult = await sendVerificationEmail(env.RESEND_API_KEY, email, code);
        if (!emailResult.success) {
            console.error('[Resend Error]:', emailResult.error);
            return NextResponse.json({ error: `Registration failed: ${emailResult.error}` }, { status: 400 });
        }

        return NextResponse.json({ step: 'verify', email });
    } catch (e) {
        console.error('[Mobile Register Error]:', e);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
