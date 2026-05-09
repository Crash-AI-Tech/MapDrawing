import { validateSession } from '@/lib/auth/session';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateCsrf } from '@/lib/csrf';

/**
 * Minimal admin guard — checks if the current user's email is in the admin list.
 * Replace with a proper role column when the user base grows.
 */
const ADMIN_EMAILS = new Set<string>([
  // Add admin emails here
]);

async function requireAdmin() {
  const result = await validateSession();
  if (!result) return null;
  if (!ADMIN_EMAILS.has(result.user.email)) return null;
  return result;
}

/**
 * GET /api/admin/reports — list reports with optional status filter.
 *
 * Query params:
 *   status — 'pending' | 'reviewed' | 'resolved' | 'dismissed' (default: 'pending')
 *   limit  — number (default: 50, max: 200)
 *   offset — number (default: 0)
 */
export async function GET(request: Request) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    const admin = await requireAdmin();
    if (!admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
    const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { env } = getCloudflareContext();

    const { results } = await env.DB.prepare(
      `SELECT r.*, u.user_name as reporter_name, u.email as reporter_email
       FROM reports r
       LEFT JOIN users u ON r.reporter_id = u.id
       WHERE r.status = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(status, limit, offset).all();

    const { results: countResult } = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM reports WHERE status = ?`
    ).bind(status).all();

    return Response.json({
      reports: results,
      total: (countResult?.[0] as { total: number })?.total ?? 0,
      limit,
      offset,
    });
  } catch (e) {
    console.error('[API /admin/reports GET]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/reports — update report status.
 *
 * Body: { id: string, status: 'reviewed' | 'resolved' | 'dismissed', adminNote?: string }
 */
export async function PATCH(request: Request) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    const admin = await requireAdmin();
    if (!admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      id?: string;
      status?: string;
      adminNote?: string;
    };

    if (!body.id || !body.status) {
      return Response.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const validStatuses = ['reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(body.status)) {
      return Response.json(
        { error: 'Invalid status. Must be: reviewed, resolved, dismissed' },
        { status: 400 }
      );
    }

    if (body.adminNote && body.adminNote.length > 1000) {
      return Response.json(
        { error: 'Admin note must be 1000 characters or less' },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(
      `UPDATE reports SET status = ?, admin_note = ?, resolved_by = ?, resolved_at = ?, updated_at = ?
       WHERE id = ?`
    ).bind(body.status, body.adminNote || null, admin.user.id, now, now, body.id).run();

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[API /admin/reports PATCH]:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
