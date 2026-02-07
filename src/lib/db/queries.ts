/**
 * D1 常用查询封装
 * 提供笔画和用户的 CRUD 操作
 */

import { getRequestContext } from '@cloudflare/next-on-pages';

// =====================
// 笔画数据类型
// =====================
export interface DrawingRow {
  id: string;
  user_id: string;
  user_name: string;
  brush_id: string;
  color: string;
  opacity: number;
  size: number;
  points: string; // JSON string
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  center_lat: number;
  center_lng: number;
  created_zoom: number;
  meta: string | null;
  created_at: number;
  updated_at: number;
}

export interface UserRow {
  id: string;
  email: string;
  user_name: string;
  password_hash: string;
  avatar_url: string | null;
  created_at: number;
  updated_at: number;
}

// =====================
// 笔画查询
// =====================

/**
 * 查询视口范围内的笔画
 */
export async function getDrawingsInViewport(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  limit = 5000
): Promise<DrawingRow[]> {
  const { env } = getRequestContext();

  const { results } = await env.DB.prepare(
    `SELECT * FROM drawings 
     WHERE min_lng <= ?1 AND max_lng >= ?2 
       AND min_lat <= ?3 AND max_lat >= ?4
     ORDER BY created_at DESC
     LIMIT ?5`
  )
    .bind(maxLng, minLng, maxLat, minLat, limit)
    .all<DrawingRow>();

  return results ?? [];
}

/**
 * 根据 ID 查询单条笔画
 */
export async function getDrawingById(id: string): Promise<DrawingRow | null> {
  const { env } = getRequestContext();

  return env.DB.prepare('SELECT * FROM drawings WHERE id = ?')
    .bind(id)
    .first<DrawingRow>();
}

/**
 * 插入笔画
 */
export async function insertDrawing(drawing: {
  id: string;
  userId: string;
  userName: string;
  brushId: string;
  color: string;
  opacity: number;
  size: number;
  points: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  createdZoom: number;
  meta?: string | null;
}): Promise<void> {
  const { env } = getRequestContext();

  const centerLat = (drawing.minLat + drawing.maxLat) / 2;
  const centerLng = (drawing.minLng + drawing.maxLng) / 2;

  await env.DB.prepare(
    `INSERT INTO drawings (id, user_id, user_name, brush_id, color, opacity, size,
                           points, min_lat, max_lat, min_lng, max_lng,
                           center_lat, center_lng, created_zoom, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      drawing.id,
      drawing.userId,
      drawing.userName,
      drawing.brushId,
      drawing.color,
      drawing.opacity,
      drawing.size,
      drawing.points,
      drawing.minLat,
      drawing.maxLat,
      drawing.minLng,
      drawing.maxLng,
      centerLat,
      centerLng,
      drawing.createdZoom,
      drawing.meta ?? null
    )
    .run();
}

/**
 * 批量插入笔画
 */
export async function batchInsertDrawings(
  db: D1Database,
  drawings: Array<{
    id: string;
    userId: string;
    userName: string;
    brushId: string;
    color: string;
    opacity: number;
    size: number;
    points: string;
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
    createdZoom: number;
    meta?: string | null;
  }>
): Promise<void> {
  if (drawings.length === 0) return;

  const stmt = db.prepare(
    `INSERT INTO drawings (id, user_id, user_name, brush_id, color, opacity, size,
                           points, min_lat, max_lat, min_lng, max_lng,
                           center_lat, center_lng, created_zoom, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const batch = drawings.map((d) =>
    stmt.bind(
      d.id,
      d.userId,
      d.userName,
      d.brushId,
      d.color,
      d.opacity,
      d.size,
      d.points,
      d.minLat,
      d.maxLat,
      d.minLng,
      d.maxLng,
      (d.minLat + d.maxLat) / 2,
      (d.minLng + d.maxLng) / 2,
      d.createdZoom,
      d.meta ?? null
    )
  );

  await db.batch(batch);
}

/**
 * 删除笔画 (仅限本人)
 */
export async function deleteDrawing(
  id: string,
  userId: string
): Promise<boolean> {
  const { env } = getRequestContext();

  const result = await env.DB.prepare(
    'DELETE FROM drawings WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

// =====================
// 用户查询
// =====================

/**
 * 根据邮箱查询用户
 */
export async function getUserByEmail(
  email: string
): Promise<UserRow | null> {
  const { env } = getRequestContext();

  return env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<UserRow>();
}

/**
 * 根据 ID 查询用户资料
 */
export async function getUserProfile(userId: string): Promise<{
  id: string;
  user_name: string;
  avatar_url: string | null;
} | null> {
  const { env } = getRequestContext();

  return env.DB.prepare(
    'SELECT id, user_name, avatar_url FROM users WHERE id = ?'
  )
    .bind(userId)
    .first();
}

/**
 * 更新用户资料
 */
export async function updateUserProfile(
  userId: string,
  updates: { userName?: string; avatarUrl?: string }
): Promise<void> {
  const { env } = getRequestContext();

  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (updates.userName !== undefined) {
    sets.push('user_name = ?');
    values.push(updates.userName);
  }
  if (updates.avatarUrl !== undefined) {
    sets.push('avatar_url = ?');
    values.push(updates.avatarUrl);
  }

  if (sets.length === 0) return;

  sets.push('updated_at = unixepoch()');
  values.push(userId);

  await env.DB.prepare(
    `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
  )
    .bind(...values)
    .run();
}
