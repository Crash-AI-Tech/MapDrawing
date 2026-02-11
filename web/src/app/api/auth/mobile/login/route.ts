import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createLucia } from '@/lib/auth/lucia';
import { verifyPassword } from '@/lib/auth/password';
import { getDBClient } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { users } from '../../../../../../../drizzle/schema';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const body = await request.json() as { email?: string; password?: string };
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const db = getDBClient();
        const user = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
        }

        const { env } = getCloudflareContext();
        const lucia = createLucia(env.DB);
        const session = await lucia.createSession(user.id, {});

        return NextResponse.json({
            token: session.id,
            user: {
                id: user.id,
                email: user.email,
                userName: user.userName,
                avatarUrl: user.avatarUrl
            }
        });

    } catch (e) {
        console.error('Mobile Login Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
