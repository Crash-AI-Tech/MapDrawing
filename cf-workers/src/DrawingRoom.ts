/**
 * DrawingRoom — Cloudflare Durable Object for real-time drawing collaboration.
 *
 * Each room corresponds to a zoom-14 tile (e.g., "14/13358/6182").
 * Handles:
 *  - WebSocket upgrade and session management
 *  - Broadcasting draw events to all connected clients
 *  - Session Token validation via D1
 *  - Stroke persistence via Queue (async batch writes)
 *  - Rate limiting per user
 *  - Heartbeat / idle eviction
 */

import type { Env } from './index';

interface Session {
  webSocket: WebSocket;
  userId: string;
  userName: string;
  joinedAt: number;
  lastActive: number;
  messageCount: number;
  rateLimitWindow: number;
}

const MAX_CONNECTIONS = 500;
const RATE_LIMIT_MAX = 60; // messages per second
const RATE_LIMIT_WINDOW = 1_000; // ms
const HEARTBEAT_INTERVAL = 30_000; // 30s
const IDLE_TIMEOUT = 300_000; // 5min

export class DrawingRoom {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, Session> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Room info endpoint
    if (url.pathname.endsWith('/info')) {
      return new Response(
        JSON.stringify({
          connections: this.sessions.size,
          maxConnections: MAX_CONNECTIONS,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // WebSocket upgrade
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    // Check connection limit
    if (this.sessions.size >= MAX_CONNECTIONS) {
      return new Response('Room is full', { status: 503 });
    }

    // Validate session token from query params or cookie
    const token = url.searchParams.get('token');
    const userInfo = await this.validateSessionToken(token);

    const userId = userInfo?.id ?? url.searchParams.get('userId') ?? `anon-${Date.now()}`;
    const userName = userInfo?.userName ?? 'Anonymous';

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the server side (Hibernation API)
    this.state.acceptWebSocket(server);

    const session: Session = {
      webSocket: server,
      userId,
      userName,
      joinedAt: Date.now(),
      lastActive: Date.now(),
      messageCount: 0,
      rateLimitWindow: Date.now(),
    };

    this.sessions.set(server, session);

    // Start heartbeat if first connection
    if (this.sessions.size === 1) {
      this.startHeartbeat();
    }

    // Notify others about new user
    this.broadcast(
      server,
      JSON.stringify({
        type: 'USER_JOIN',
        userId,
        userName,
        connections: this.sessions.size,
      })
    );

    // Send welcome message
    server.send(
      JSON.stringify({
        type: 'WELCOME',
        userId,
        userName,
        connections: this.sessions.size,
      })
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) return;

    session.lastActive = Date.now();

    // Rate limiting
    const now = Date.now();
    if (now - session.rateLimitWindow > RATE_LIMIT_WINDOW) {
      session.messageCount = 0;
      session.rateLimitWindow = now;
    }
    session.messageCount++;

    if (session.messageCount > RATE_LIMIT_MAX) {
      ws.send(
        JSON.stringify({ type: 'ERROR', message: 'Rate limit exceeded' })
      );
      return;
    }

    // Parse and validate message
    if (typeof message !== 'string') return;

    try {
      const data = JSON.parse(message);

      // Handle ping
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        return;
      }

      // Attach sender info
      data._senderId = session.userId;
      data._senderName = session.userName;

      // Broadcast to all OTHER clients
      this.broadcast(ws, JSON.stringify(data));

      // Stroke events → push to Queue for async D1 persistence
      if (data.type === 'STROKE_ADD' && data.stroke && this.env.STROKE_QUEUE) {
        try {
          await this.env.STROKE_QUEUE.send({
            ...data.stroke,
            userId: session.userId,
            userName: session.userName,
          });
        } catch (err) {
          console.error('[DrawingRoom] Queue send error:', err);
        }
      }
    } catch {
      // Invalid JSON — ignore
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.removeSession(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('[DrawingRoom] WebSocket error:', error);
    this.removeSession(ws);
  }

  // ========================
  // Auth: Validate Lucia Session Token via D1
  // ========================

  private async validateSessionToken(
    token: string | null
  ): Promise<{ id: string; userName: string } | null> {
    if (!token || !this.env.DB) return null;

    try {
      const result = await this.env.DB.prepare(
        `SELECT u.id, u.user_name 
         FROM sessions s JOIN users u ON s.user_id = u.id
         WHERE s.id = ? AND s.expires_at > unixepoch()`
      )
        .bind(token)
        .first<{ id: string; user_name: string }>();

      if (!result) return null;
      return { id: result.id, userName: result.user_name };
    } catch (err) {
      console.error('[DrawingRoom] Token validation error:', err);
      return null;
    }
  }

  // ========================
  // Internals
  // ========================

  private broadcast(sender: WebSocket, message: string): void {
    for (const [ws] of this.sessions) {
      if (ws === sender) continue;
      try {
        ws.send(message);
      } catch {
        // Dead connection — will be cleaned up by heartbeat
        this.removeSession(ws);
      }
    }
  }

  private removeSession(ws: WebSocket): void {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);

    try {
      ws.close(1000, 'Session ended');
    } catch {
      // Already closed
    }

    // Notify others about user leaving
    if (session) {
      this.broadcast(
        ws,
        JSON.stringify({
          type: 'USER_LEAVE',
          userId: session.userId,
          connections: this.sessions.size,
        })
      );
    }

    // Stop heartbeat if no connections
    if (this.sessions.size === 0 && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [ws, session] of this.sessions) {
        // Evict idle connections
        if (now - session.lastActive > IDLE_TIMEOUT) {
          ws.send(
            JSON.stringify({ type: 'IDLE_DISCONNECT', timeout: IDLE_TIMEOUT })
          );
          this.removeSession(ws);
          continue;
        }

        // Send heartbeat
        try {
          ws.send(JSON.stringify({ type: 'HEARTBEAT', timestamp: now }));
        } catch {
          this.removeSession(ws);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }
}
