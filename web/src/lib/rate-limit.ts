/**
 * 基于 Cloudflare KV 的 API 限流器
 * 使用滑动窗口计数器实现
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
    const kvKey = `rl:${key}`;

    const now = Date.now();
    const stored = await env.CACHE.get(kvKey, 'json') as { count: number; windowStart: number } | null;

    if (!stored || now - stored.windowStart > windowMs) {
      // New window
      await env.CACHE.put(kvKey, JSON.stringify({ count: 1, windowStart: now }), {
        expirationTtl: Math.ceil(windowMs / 1000) + 1,
      });
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    if (stored.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: stored.windowStart + windowMs,
      };
    }

    // Increment
    await env.CACHE.put(
      kvKey,
      JSON.stringify({ count: stored.count + 1, windowStart: stored.windowStart }),
      { expirationTtl: Math.ceil((stored.windowStart + windowMs - now) / 1000) + 1 }
    );

    return {
      allowed: true,
      remaining: maxRequests - stored.count - 1,
      resetAt: stored.windowStart + windowMs,
    };
  } catch (e) {
    // If KV fails, allow the request (fail open)
    console.error('[RateLimit] KV error:', e);
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() };
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
