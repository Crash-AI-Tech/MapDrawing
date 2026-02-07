/**
 * D1 数据库表结构定义 (Drizzle ORM)
 * 用于类型安全查询和迁移生成
 */

import {
  sqliteTable,
  text,
  real,
  integer,
} from 'drizzle-orm/sqlite-core';

// =====================
// 用户表 (Lucia Auth)
// =====================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  userName: text('user_name').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
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
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  userName: text('user_name').notNull(),
  brushId: text('brush_id').notNull().default('pencil'),
  color: text('color').notNull().default('#000000'),
  opacity: real('opacity').notNull().default(1.0),
  size: real('size').notNull().default(1.0),

  // 点数据 (JSON 数组)
  points: text('points').notNull(), // JSON string

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
  updatedAt: integer('updated_at', { mode: 'number' })
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
});
