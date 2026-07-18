import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession } from '@/lib/auth/session';

const MAX_INK = 100;
const REGEN_INTERVAL_SECONDS = 18;

export async function GET(request: Request) {
  const session = await validateSession(request);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = getCloudflareContext();
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `SELECT MIN(
       ${MAX_INK},
       ink + MAX(0, CAST((?2 - updated_at) / ${REGEN_INTERVAL_SECONDS} AS INTEGER))
     ) AS ink
     FROM user_ink
     WHERE user_id = ?1`
  )
    .bind(session.user.id, now)
    .first<{ ink: number }>();

  return Response.json({ ink: row?.ink ?? MAX_INK, maxInk: MAX_INK });
}
