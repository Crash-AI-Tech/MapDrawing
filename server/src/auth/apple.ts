import { importPKCS8, SignJWT } from 'jose';

interface AppleServerEnv {
  APPLE_CLIENT_ID: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  AUTH_SECRET: string;
}

interface AppleTokenResponse {
  refresh_token?: string;
  error?: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function sealAppleRefreshToken(token: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(secret),
    new TextEncoder().encode(token),
  );
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(encrypted))}`;
}

async function openAppleRefreshToken(value: string, secret: string): Promise<string> {
  const [version, encodedIv, encodedData] = value.split('.');
  if (version !== 'v1' || !encodedIv || !encodedData) throw new Error('Unsupported Apple token envelope');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(base64UrlDecode(encodedIv)) },
    await encryptionKey(secret),
    asArrayBuffer(base64UrlDecode(encodedData)),
  );
  return new TextDecoder().decode(decrypted);
}

async function createAppleClientSecret(env: AppleServerEnv): Promise<string> {
  if (!env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
    throw new Error('Apple server credentials are not configured');
  }
  const privateKey = env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const key = await importPKCS8(privateKey, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .setAudience('https://appleid.apple.com')
    .setSubject(env.APPLE_CLIENT_ID)
    .sign(key);
}

export async function exchangeAppleAuthorizationCode(
  authorizationCode: string,
  env: AppleServerEnv,
): Promise<string | null> {
  const clientSecret = await createAppleClientSecret(env);
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  const body = await response.json() as AppleTokenResponse;
  if (!response.ok) throw new Error(`Apple token exchange failed: ${body.error ?? response.status}`);
  return body.refresh_token ?? null;
}

export async function revokeAppleAuthorization(
  sealedRefreshToken: string,
  env: AppleServerEnv,
): Promise<boolean> {
  const refreshToken = await openAppleRefreshToken(sealedRefreshToken, env.AUTH_SECRET);
  const clientSecret = await createAppleClientSecret(env);
  const response = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID,
      client_secret: clientSecret,
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });
  return response.ok;
}
