/**
 * Cloudflare Bindings 工具函数
 * 统一获取 D1、R2、DO 等绑定
 */

import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * 获取 Cloudflare Bindings（仅在 Edge Runtime 中使用）
 */
export function getEnv(): CloudflareEnv {
  return getRequestContext().env;
}

/**
 * 获取 D1 数据库实例
 */
export function getDB(): D1Database {
  return getEnv().DB;
}

/**
 * 获取 R2 存储桶实例
 */
export function getBucket(): R2Bucket {
  return getEnv().BUCKET;
}
