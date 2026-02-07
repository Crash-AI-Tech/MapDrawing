/**
 * D1 数据库客户端
 * 封装 D1 访问和 Drizzle ORM 集成
 */

import { getRequestContext } from '@cloudflare/next-on-pages';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../drizzle/schema';

/**
 * 获取 Drizzle ORM 客户端实例 (用于 Server Component / Route Handler)
 */
export function getDBClient() {
  const { env } = getRequestContext();
  return drizzle(env.DB, { schema });
}

/**
 * 获取原始 D1Database 实例 (用于自定义查询)
 */
export function getRawDB(): D1Database {
  return getRequestContext().env.DB;
}
