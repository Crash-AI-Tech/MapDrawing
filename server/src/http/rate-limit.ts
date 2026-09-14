/**
 * 基于 D1 单语句 UPSERT 的固定窗口限流器。
 *
 * Workers KV 是最终一致存储，read-modify-write 无法作为并发安全的计数器。
 * D1 对单条 SQL 语句串行执行，因此同一 key 的递增是原子的。
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * 检查请求是否在速率限制内
 * @param key - 限流键 (如 `drawings:POST:${userId}`)
 * @param maxRequests - 窗口内最大请求数
 * @param windowMs - 窗口时间 (ms)
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const { env } = getCloudflareContext();
    const now = Date.now();
    const cutoff = now - windowMs;
    const expiresAt = now + windowMs;

    const row = await env.DB.prepare(
      `INSERT INTO api_rate_limits (key, window_start, request_count, expires_at)
       VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(key) DO UPDATE SET
         window_start = CASE
           WHEN api_rate_limits.window_start <= ?4 THEN excluded.window_start
           ELSE api_rate_limits.window_start
         END,
         request_count = CASE
           WHEN api_rate_limits.window_start <= ?4 THEN 1
           ELSE api_rate_limits.request_count + 1
         END,
         expires_at = CASE
           WHEN api_rate_limits.window_start <= ?4 THEN excluded.expires_at
           ELSE api_rate_limits.expires_at
         END
       RETURNING window_start, request_count`
    )
      .bind(key, now, expiresAt, cutoff)
      .first<{ window_start: number; request_count: number }>();

    if (!row) throw new Error('Rate limit counter did not return a row');

    const allowed = row.request_count <= maxRequests;
    const resetAt = row.window_start + windowMs;

    return {
      allowed,
      remaining: Math.max(0, maxRequests - row.request_count),
      resetAt,
    };
  } catch (e) {
    // Mutating endpoints must not become unlimited when the limiter is unavailable.
    console.error('[RateLimit] D1 error:', e);
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
  }
}

/**
 * 从请求中提取客户端 IP
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * 创建 429 限流响应
 */
export function rateLimitResponse(resetAt: number): Response {
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    }
  );
}
