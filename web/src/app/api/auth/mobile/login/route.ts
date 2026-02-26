import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createLucia } from '@/lib/auth/lucia';
import { verifyUserCredentialsEdge } from '@/lib/auth/service';


export async function POST(request: Request) {
    try {
        console.log('[DEBUG] Starting mobile login API');
        const body = await request.json() as { email?: string; password?: string };
        const { email, password } = body;

        if (!email || !password) {
            console.log('[DEBUG] Missing credentials');
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        console.log('[DEBUG] Getting Cloudflare Context');
        const { env } = getCloudflareContext();

        console.log('[DEBUG] Verifying credentials via service');
        const user = await verifyUserCredentialsEdge(email, password, env);

        if (!user) {
            console.log('[DEBUG] User authentication failed');
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
        }

        console.log('[DEBUG] Creating Lucia Session');
        const lucia = createLucia(env.DB);
        const session = await lucia.createSession(user.id, {});

        console.log('[DEBUG] Returning token');
        return NextResponse.json({
            token: session.id,
            user: {
                id: user.id,
                email: user.email,
                userName: user.user_name,
                avatarUrl: user.avatar_url
            }
        });

    } catch (e) {
        console.error('Mobile Login Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
