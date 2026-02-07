/**
 * Cloudflare Worker entry point — routes WebSocket upgrade requests
 * to the correct DrawingRoom Durable Object instance.
 *
 * Also handles Queue consumption for batch D1 writes.
 *
 * URL format: /ws/:roomId
 */

import { DrawingRoom } from './DrawingRoom';
import { handleQueueBatch } from './BatchWriter';

export { DrawingRoom };

export interface Env {
  DRAWING_ROOM: DurableObjectNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
  STROKE_QUEUE: Queue<any>;
  ALLOWED_ORIGINS: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // WebSocket upgrade: /ws/:roomId
    const wsMatch = url.pathname.match(/^\/ws\/(.+)$/);
    if (wsMatch) {
      const roomId = wsMatch[1];

      // Validate upgrade header
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      // Get or create the Durable Object for this room
      const id = env.DRAWING_ROOM.idFromName(roomId);
      const stub = env.DRAWING_ROOM.get(id);

      // Forward the request to the DO
      return stub.fetch(request);
    }

    // Room info: /room/:roomId/info
    const infoMatch = url.pathname.match(/^\/room\/(.+)\/info$/);
    if (infoMatch) {
      const roomId = infoMatch[1];
      const id = env.DRAWING_ROOM.idFromName(roomId);
      const stub = env.DRAWING_ROOM.get(id);
      return stub.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },

  // Queue Consumer: 批量写入笔画到 D1
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    await handleQueueBatch(batch, env);
  },
};

function handleCors(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin') ?? '';
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim());
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : '',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Upgrade',
      'Access-Control-Max-Age': '86400',
    },
  });
}
