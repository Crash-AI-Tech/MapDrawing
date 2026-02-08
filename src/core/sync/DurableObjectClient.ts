import type { SyncState, DrawEvent, SyncMessage } from '../types';
import { serializeEvent, deserializeEvent } from './EventStream';
import { v7 as uuidv7 } from 'uuid';

export type DOConnectionListener = (state: SyncState) => void;
export type DOMessageListener = (event: DrawEvent, senderId: string) => void;

export interface DOClientConfig {
  /** WebSocket URL for the Durable Objects worker */
  baseUrl: string;
  /** Auth token for the connection */
  accessToken: string;
  /** Current user ID */
  userId: string;
}

/**
 * DurableObjectClient — WebSocket client for connecting to Cloudflare DO rooms.
 * Handles connection lifecycle, reconnection, and message routing.
 */
export class DurableObjectClient {
  private ws: WebSocket | null = null;
  private config: DOClientConfig;
  private currentRoom: string | null = null;
  private state: SyncState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectBaseDelay = 1000; // ms

  private connectionListeners = new Set<DOConnectionListener>();
  private messageListeners = new Set<DOMessageListener>();

  constructor(config: DOClientConfig) {
    this.config = config;
  }

  /** Connect to a specific room (tile key) */
  connect(room: string): void {
    // If already connected to this room, do nothing
    if (this.currentRoom === room && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Disconnect from current room if different
    if (this.currentRoom !== room) {
      this.disconnect();
    }

    this.currentRoom = room;
    this.setState('connecting');

    try {
      const url = `${this.config.baseUrl}/ws/${encodeURIComponent(room)}?token=${this.config.accessToken}&userId=${this.config.userId}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('connected');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        if (event.code !== 1000) {
          // Abnormal close — try to reconnect
          this.setState('disconnected');
          this.scheduleReconnect();
        } else {
          this.setState('disconnected');
        }
      };

      this.ws.onerror = () => {
        this.setState('error');
      };
    } catch (e) {
      console.error('[DOClient] Connection error:', e);
      this.setState('error');
      this.scheduleReconnect();
    }
  }

  /** Send a draw event to the current room */
  send(event: DrawEvent): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.currentRoom) {
      return false;
    }

    const message: SyncMessage = {
      room: this.currentRoom,
      msgId: uuidv7(),
      event,
      senderId: this.config.userId,
    };

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  /** Disconnect from the current room */
  disconnect(): void {
    this.cancelReconnect();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
    this.currentRoom = null;
    this.setState('disconnected');
  }

  /** Get current connection state */
  getState(): SyncState {
    return this.state;
  }

  /** Get current room */
  getRoom(): string | null {
    return this.currentRoom;
  }

  /** Subscribe to connection state changes */
  onStateChange(listener: DOConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  /** Subscribe to incoming draw events */
  onMessage(listener: DOMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /** Update access token (e.g., after refresh) */
  updateToken(token: string): void {
    this.config.accessToken = token;
  }

  /** Clean up */
  dispose(): void {
    this.disconnect();
    this.connectionListeners.clear();
    this.messageListeners.clear();
  }

  // ========================
  // Internals
  // ========================

  private handleMessage(data: string): void {
    try {
      const message: SyncMessage = JSON.parse(data);

      // Skip our own messages
      if (message.senderId === this.config.userId) return;

      const event = message.event;
      if (event) {
        this.messageListeners.forEach((l) => l(event, message.senderId));
      }
    } catch {
      // Try parsing as raw event
      const event = deserializeEvent(data);
      if (event) {
        this.messageListeners.forEach((l) => l(event, ''));
      }
    }
  }

  private setState(state: SyncState): void {
    if (this.state === state) return;
    this.state = state;
    this.connectionListeners.forEach((l) => l(state));
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DOClient] Max reconnect attempts reached');
      this.setState('error');
      return;
    }

    this.cancelReconnect();

    // Exponential backoff with jitter
    const delay =
      this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts) +
      Math.random() * 1000;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.currentRoom) {
        this.connect(this.currentRoom);
      }
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
