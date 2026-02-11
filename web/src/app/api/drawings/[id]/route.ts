import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession } from '@/lib/auth/session';
import { getDrawingById, deleteDrawing } from '@/lib/db/queries';

/**
 * GET /api/drawings/[id] — fetch a single stroke by ID (D1).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await getDrawingById(id);

    if (!data) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const stroke = {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      brushId: data.brush_id,
      color: data.color,
      opacity: data.opacity,
      size: data.size,
      points:
        typeof data.points === 'string'
          ? JSON.parse(data.points)
          : data.points,
      bounds: {
        minLng: data.min_lng,
        maxLng: data.max_lng,
        minLat: data.min_lat,
        maxLat: data.max_lat,
      },
      createdZoom: data.created_zoom,
      createdAt: data.created_at * 1000,
      meta: data.meta ? JSON.parse(data.meta) : null,
    };

    return Response.json(stroke);
  } catch (e) {
    console.error(`[API /drawings/${id}] Error:`, e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/drawings/[id] — delete a stroke by ID (仅限本人).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await validateSession();
    if (!result) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deleted = await deleteDrawing(id, result.user.id);

    if (!deleted) {
      return Response.json(
        { error: 'Not found or not authorized' },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error(`[API /drawings/${id} DELETE]:`, e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
