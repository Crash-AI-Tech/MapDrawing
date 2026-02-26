/**
 * Edge-Compatible Authentication Service
 * 
 * Provides unified authentication logic that works reliably in Cloudflare Pages
 * Edge Runtime without relying on Node.js core modules.
 */

export async function verifyUserCredentialsEdge(email: string, password: string, env: any) {
    const user = await env.DB.prepare('SELECT id, email, user_name, password_hash, avatar_url, email_verified FROM users WHERE email = ?')
        .bind(email)
        .first() as { id: string, email: string, user_name: string, password_hash: string, avatar_url: string | null, email_verified: number } | null;

    if (!user) {
        return null; // Invalid email
    }

    const parts = user.password_hash.split(':');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
        return null; // Invalid format
    }

    const iterations = parseInt(parts[1], 10);
    const hex = parts[2];
    const salt = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        salt[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    const expectedHash = parts[3];

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );

    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    let isValid = hashHex.length === expectedHash.length;
    if (isValid) {
        let result = 0;
        for (let i = 0; i < hashHex.length; i++) {
            result |= hashHex.charCodeAt(i) ^ expectedHash.charCodeAt(i);
        }
        isValid = result === 0;
    }

    if (!isValid) return null;

    return user;
}
