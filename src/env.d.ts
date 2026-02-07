/**
 * Cloudflare Bindings 类型声明
 * 在 Edge Runtime 中通过 getRequestContext() 访问
 */

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
}

// @cloudflare/next-on-pages 类型增强
declare module '@cloudflare/next-on-pages' {
  export function getRequestContext(): {
    env: CloudflareEnv;
    ctx: ExecutionContext;
    cf: IncomingRequestCfProperties;
  };
}
