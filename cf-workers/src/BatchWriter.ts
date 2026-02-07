/**
 * BatchWriter — Queue Consumer
 * 从 Cloudflare Queue 消费笔画事件，批量写入 D1
 *
 * Queue 配置: max_batch_size=100, max_batch_timeout=5s
 * 即最多攒 100 条或 5 秒触发一次批量写入
 */

import type { Env } from './index';

interface StrokeEvent {
  id: string;
  userId: string;
  userName: string;
  brushId: string;
  color: string;
  opacity: number;
  size: number;
  points: any; // StrokePoint[] or JSON string
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  createdZoom: number;
  meta?: Record<string, unknown>;
}

export async function handleQueueBatch(
  batch: MessageBatch<StrokeEvent>,
  env: Env
): Promise<void> {
  if (batch.messages.length === 0) return;

  const strokes = batch.messages.map((m) => m.body);

  const stmt = env.DB.prepare(
    `INSERT OR IGNORE INTO drawings 
       (id, user_id, user_name, brush_id, color, opacity, size,
        points, min_lat, max_lat, min_lng, max_lng,
        center_lat, center_lng, created_zoom, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const batchOps = strokes.map((s) =>
    stmt.bind(
      s.id,
      s.userId,
      s.userName,
      s.brushId ?? 'pencil',
      s.color ?? '#000000',
      s.opacity ?? 1.0,
      s.size ?? 1.0,
      typeof s.points === 'string' ? s.points : JSON.stringify(s.points),
      s.bounds?.minLat ?? 0,
      s.bounds?.maxLat ?? 0,
      s.bounds?.minLng ?? 0,
      s.bounds?.maxLng ?? 0,
      ((s.bounds?.minLat ?? 0) + (s.bounds?.maxLat ?? 0)) / 2,
      ((s.bounds?.minLng ?? 0) + (s.bounds?.maxLng ?? 0)) / 2,
      s.createdZoom ?? 14,
      s.meta ? JSON.stringify(s.meta) : null
    )
  );

  try {
    await env.DB.batch(batchOps);
    console.log(`[BatchWriter] Wrote ${strokes.length} strokes to D1`);
  } catch (err) {
    console.error('[BatchWriter] Batch write failed:', err);
    // 消息会自动重试
    throw err;
  }
}
