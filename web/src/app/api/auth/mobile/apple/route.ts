import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createLucia } from '@/lib/auth/lucia';
import { hashPassword } from '@/lib/auth/password';
import { getDBClient } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { users } from '../../../../../../../drizzle/schema';
import { createRemoteJWKSet, jwtVerify } from 'jose';
function generateId(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(x => chars[x % chars.length]).join('');
}


const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

interface AppleUser {
    name?: {
        firstName?: string;
        lastName?: string;
    };
    email?: string;
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as { identityToken: string; user?: string }; // user is JSON string from ASAuthorizationAppleIDCredential
        const { identityToken, user: userJson } = body;

        if (!identityToken) {
            return NextResponse.json({ error: 'Missing identity token' }, { status: 400 });
        }

        // Verify Apple Token
        const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
            issuer: 'https://appleid.apple.com',
            // audience: process.env.ios_bundle_id // Optional: verify if you want strict checks
        });

        const appleId = payload.sub;
        const email = payload.email as string | undefined;

        if (!appleId) {
            return NextResponse.json({ error: 'Invalid token: missing sub' }, { status: 400 });
        }

        const { env } = getCloudflareContext();
        const db = getDBClient();

        // Check if user exists
        let user = await db.query.users.findFirst({
            where: eq(users.appleId, appleId)
        });

        // If not found, try by email (account linking)
        // Security: only link if the existing account's email is verified,
        // preventing attackers from pre-registering with victim's email then
        // hijacking via Apple Sign-In.
        if (!user && email) {
            user = await db.query.users.findFirst({
                where: eq(users.email, email)
            });

            if (user) {
                // Check email_verified via raw D1 (column not in Drizzle schema yet)
                const verifiedRow = await env.DB.prepare(
                    'SELECT email_verified FROM users WHERE id = ?'
                ).bind(user.id).first<{ email_verified: number }>();

                if (!verifiedRow || !verifiedRow.email_verified) {
                    return NextResponse.json(
                        { error: 'An unverified account exists with this email. Please verify it first.' },
                        { status: 409 }
                    );
                }
                await db.update(users).set({ appleId }).where(eq(users.id, user.id));
            }
        }

        // Create user if still not found
        if (!user) {
            if (!email) {
                return NextResponse.json({ error: 'Email required for registration' }, { status: 400 });
            }

            let userName = `User_${generateId(8)}`;
            if (userJson) {
                try {
                    const appleUser = JSON.parse(userJson) as AppleUser;
                    if (appleUser.name?.firstName) {
                        userName = `${appleUser.name.firstName} ${appleUser.name.lastName || ''}`.trim();
                    }
                } catch (e) {
                    // ignore json parse error
                }
            }

            // Generate a random password since they use Apple Sign In
            const dummyPassword = await hashPassword(generateId(15));
            const newUserId = generateId(15);

            await db.insert(users).values({
                id: newUserId,
                email,
                userName,
                passwordHash: dummyPassword,
                appleId,
                avatarUrl: null,
                createdAt: Math.floor(Date.now() / 1000),
                updatedAt: Math.floor(Date.now() / 1000),
            });

            user = await db.query.users.findFirst({
                where: eq(users.id, newUserId)
            });
        }

        if (!user) {
            return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }

        // Create session
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
        console.error('Apple Login Error:', e);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
