/**
 * D1 数据库表结构定义 (Drizzle ORM)
 * 用于类型安全查询和迁移生成
 */

import {
  sqliteTable,
  text,
  real,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core';

// =====================
// 用户表 (Lucia Auth)
// =====================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  userName: text('user_name').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  appleId: text('apple_id').unique(), // For Sign in with Apple
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'number' })
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at', { mode: 'number' })
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// =====================
// Session 表 (Lucia Auth)
// =====================
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'number' }).notNull(),
});

// =====================
// 笔画数据表
// =====================
export const drawings = sqliteTable('drawings', {
  id: text('id').primaryKey(), // UUID v7
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  userName: text('user_name').notNull(),
  brushId: text('brush_id').notNull().default('pencil'),
  color: text('color').notNull().default('#000000'),
  opacity: real('opacity').notNull().default(1.0),
  size: real('size').notNull().default(1.0),

  // 点数据 (JSON 数组)
  points: text('points').notNull(), // JSON string
  pointCount: integer('point_count').notNull().default(0),

  // 边界框 (用于空间查询)
  minLat: real('min_lat').notNull(),
  maxLat: real('max_lat').notNull(),
  minLng: real('min_lng').notNull(),
  maxLng: real('max_lng').notNull(),

  // 中心点 (用于聚类)
  centerLat: real('center_lat').notNull(),
  centerLng: real('center_lng').notNull(),

  createdZoom: integer('created_zoom').notNull().default(18),
  meta: text('meta'), // JSON string
  createdAt: integer('created_at', { mode: 'number' })
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
  createdAtMs: integer('created_at_ms', { mode: 'number' }),
  updatedAt: integer('updated_at', { mode: 'number' })
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// =====================
// 地图图钉
// =====================
export const mapPins = sqliteTable('map_pins', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  userName: text('user_name').notNull().default('Anonymous'),
  lng: real('lng').notNull(),
  lat: real('lat').notNull(),
  message: text('message').notNull().default(''),
  color: text('color').notNull().default('#E63946'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  createdAtMs: integer('created_at_ms', { mode: 'number' }),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

// =====================
// 邮箱验证/密码重置
// =====================
export const verificationCodes = sqliteTable('verification_codes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  code: text('code').notNull(),
  type: text('type').notNull().default('email_verification'),
  expiresAt: integer('expires_at', { mode: 'number' }).notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

// =====================
// 用户屏蔽关系
// =====================
export const blockedUsers = sqliteTable('blocked_users', {
  blockerId: text('blocker_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  blockedId: text('blocked_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
}, (table) => [primaryKey({ columns: [table.blockerId, table.blockedId] })]);

// =====================
// 服务端墨水与原子限流
// =====================
export const userInk = sqliteTable('user_ink', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  ink: real('ink').notNull().default(100),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

export const apiRateLimits = sqliteTable('api_rate_limits', {
  key: text('key').primaryKey(),
  windowStart: integer('window_start', { mode: 'number' }).notNull(),
  requestCount: integer('request_count').notNull(),
  expiresAt: integer('expires_at', { mode: 'number' }).notNull(),
});

export const drawingTiles = sqliteTable('drawing_tiles', {
  z: integer('z').notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  drawingId: text('drawing_id')
    .notNull()
    .references(() => drawings.id, { onDelete: 'cascade' }),
  createdAtMs: integer('created_at_ms', { mode: 'number' }).notNull(),
}, (table) => [primaryKey({ columns: [table.z, table.x, table.y, table.drawingId] })]);

// =====================
// 举报/审核表
// =====================
export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  contentId: text('content_id').notNull(),
  contentType: text('content_type').notNull(), // 'pin' | 'drawing' | 'user'
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  adminNote: text('admin_note'),
  resolvedBy: text('resolved_by')
    .references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: integer('resolved_at', { mode: 'number' }),
  createdAt: integer('created_at', { mode: 'number' })
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at', { mode: 'number' })
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
});
