import { headers } from 'next/headers';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkRateLimit } from '@/lib/rate-limit';

/** Shared between Server Actions and native endpoints; no raw email/IP in keys. */
export async function allowAuthAttempt(action: string, email: string, request?: Request): Promise<boolean> {
  const hdrs = request?.headers ?? await headers();
  const { env } = getCloudflareContext();
  const ip = hdrs.get('cf-connecting-ip') ?? 'local';
  const digest = async (value: string) => {
    const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.AUTH_SECRET}:${value}`));
    return Array.from(new Uint8Array(data), n => n.toString(16).padStart(2, '0')).join('');
  };
  const account = await checkRateLimit(`auth:${action}:${await digest(email)}`, action === 'verify' ? 5 : action === 'login' ? 10 : 3, action === 'verify' ? 900_000 : 60_000);
  if (!account.allowed) return false;
  return (await checkRateLimit(`auth-ip:${action}:${await digest(ip)}`, 30, 60_000)).allowed;
}
