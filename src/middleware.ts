import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — Lucia Auth 认证守卫
 *
 * 通过 Cookie 中的 session token 判断登录状态。
 * 注意: Middleware 运行于 Edge Runtime，无法直接调用 D1 验证 Session，
 * 因此只检查 Cookie 是否存在。真正的 Session 验证在 Route Handler / Server Action 中进行。
 */

/** Protected paths that require authentication */
const PROTECTED_PATHS: string[] = []; // Currently all accessible as guest
/** Auth paths (no longer standalone pages, handled by dialogs) */
const AUTH_PATHS: string[] = [];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 从 Cookie 读取 Session Token
  const sessionToken = request.cookies.get('session')?.value;

  // Protected routes: redirect to canvas if not authenticated
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    if (!sessionToken) {
      const canvasUrl = new URL('/canvas', request.url);
      return NextResponse.redirect(canvasUrl);
    }
  }

  // Auth routes: skip redirect if explicitly coming from failed session validation
  // The actual auth guard is in canvas/layout.tsx (Server Component)
  // Don't redirect already-logged-in users from auth pages — let the canvas layout handle it
  // This avoids a redirect loop when a cookie exists but the session is invalid
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser requests)
     * - public files (assets)
     * - API routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
