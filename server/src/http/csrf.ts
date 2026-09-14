/**
 * CSRF 保护
 * 使用 Origin/Referer 检查 (适用于 Cloudflare Workers Edge Runtime)
 *
 * 对于 API 路由的 POST/PATCH/DELETE 请求，验证 Origin header 匹配当前域名。
 * 这比 double-submit cookie 更简单，且不需要额外的前端配合。
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * 验证请求是否来自同源
 * @returns null if valid, Response if rejected
 */
export function validateCsrf(request: Request): Response | null {
  // Skip safe methods
  if (SAFE_METHODS.has(request.method)) return null;

  // Skip Bearer token requests (mobile API clients)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return null;

  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  const host = request.headers.get('Host');

  // Allow if no Origin (e.g. server-side calls, same-origin form submissions in some browsers)
  if (!origin && !referer) return null;

  // Check Origin matches Host
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) return null;
    } catch {
      // Invalid origin
    }
  }

  // Fallback: check Referer
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host) return null;
    } catch {
      // Invalid referer
    }
  }

  return Response.json(
    { error: 'Forbidden: cross-origin request rejected' },
    { status: 403 }
  );
}
