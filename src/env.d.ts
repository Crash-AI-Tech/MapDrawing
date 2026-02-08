/**
 * Cloudflare Bindings 类型声明
 * 在 Edge Runtime 中通过 getCloudflareContext() 访问
 */

// @opennextjs/cloudflare 全局类型增强
// CloudflareEnv 是 @opennextjs/cloudflare 声明的全局接口，通过 declaration merging 扩展
declare global {
  interface CloudflareEnv {
    // D1 数据库
    DB: D1Database;

    // R2 存储桶
    BUCKET: R2Bucket;

    // Durable Objects
    DRAWING_ROOM: DurableObjectNamespace;

    // KV 缓存
    CACHE: KVNamespace;

    // Queues
    STROKE_QUEUE: Queue<import('@/core/types/stroke').StrokeData>;

    // 环境变量
    AUTH_SECRET: string;
    RESEND_API_KEY: string;
  }
}

export {};
