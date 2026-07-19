/**
 * D1 常用查询封装
 * 提供笔画和用户的 CRUD 操作
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

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
  point_count: number;
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  created_zoom: number;
  meta: string | null;
  created_at_ms: number;
  updated_at_ms: number;
}

export interface UserRow {
  id: string;
  email: string;
  user_name: string;
  password_hash: string;
  avatar_url: string | null;
  created_at: number;
  updated_at: number;
  apple_refresh_token: string | null;
}

// =====================
// 笔画查询
// =====================

/**
 * 根据 ID 查询单条笔画
 */
export async function getDrawingById(id: string): Promise<DrawingRow | null> {
  const { env } = getCloudflareContext();

  return env.DB.prepare('SELECT * FROM drawings WHERE id = ?')
    .bind(id)
    .first<DrawingRow>();
}

/**
 * 删除笔画 (仅限本人)
 */
export async function deleteDrawing(
  id: string,
  userId: string
): Promise<boolean> {
  const { env } = getCloudflareContext();

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
  const { env } = getCloudflareContext();

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
  const { env } = getCloudflareContext();

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
  const { env } = getCloudflareContext();

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

export async function getUserDeletionData(userId: string): Promise<{
  avatar_url: string | null;
  apple_refresh_token: string | null;
} | null> {
  const { env } = getCloudflareContext();
  return env.DB.prepare('SELECT avatar_url, apple_refresh_token FROM users WHERE id = ?')
    .bind(userId)
    .first();
}

/** Permanently delete an account and every row of user-generated content. */
export async function deleteUserAccountData(userId: string): Promise<void> {
  const { env } = getCloudflareContext();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM reports
      WHERE reporter_id = ?1
         OR (content_type = 'user' AND content_id = ?1)
         OR (content_type = 'drawing' AND content_id IN (SELECT id FROM drawings WHERE user_id = ?1))
         OR (content_type = 'pin' AND content_id IN (SELECT id FROM map_pins WHERE user_id = ?1))`)
      .bind(userId),
    env.DB.prepare('DELETE FROM drawings WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM map_pins WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
}

// =====================
// 屏蔽用户查询
// =====================

export interface BlockedUserRow {
  blocked_id: string;
  user_name: string;
  avatar_url: string | null;
  created_at: number;
}

/**
 * 屏蔽一个用户
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { env } = getCloudflareContext();
  await env.DB.prepare(
    'INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)'
  )
    .bind(blockerId, blockedId)
    .run();
}

/**
 * 取消屏蔽
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { env } = getCloudflareContext();
  await env.DB.prepare(
    'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?'
  )
    .bind(blockerId, blockedId)
    .run();
}

/**
 * 获取当前用户的屏蔽列表（含被屏蔽人的基本信息）
 */
export async function getBlockedUsers(blockerId: string): Promise<BlockedUserRow[]> {
  const { env } = getCloudflareContext();
  const { results } = await env.DB.prepare(
    `SELECT bu.blocked_id, u.user_name, u.avatar_url, bu.created_at
     FROM blocked_users bu
     LEFT JOIN users u ON u.id = bu.blocked_id
     WHERE bu.blocker_id = ?
     ORDER BY bu.created_at DESC`
  )
    .bind(blockerId)
    .all<BlockedUserRow>();
  return results ?? [];
}

/**
 * 检查某用户是否屏蔽了另一个用户
 */
export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { env } = getCloudflareContext();
  const row = await env.DB.prepare(
    'SELECT 1 FROM blocked_users WHERE blocker_id = ? AND blocked_id = ? LIMIT 1'
  )
    .bind(blockerId, blockedId)
    .first();
  return !!row;
}

/**
 * 获取用户被哪些人屏蔽（用于过滤查询）
 */
export async function getBlockedByIds(userId: string): Promise<string[]> {
  const { env } = getCloudflareContext();
  const { results } = await env.DB.prepare(
    'SELECT blocker_id FROM blocked_users WHERE blocked_id = ?'
  )
    .bind(userId)
    .all<{ blocker_id: string }>();
  return (results ?? []).map((r) => r.blocker_id);
}
