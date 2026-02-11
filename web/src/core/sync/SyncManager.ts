import type { DrawEvent, StrokeData, SyncState, GeoBounds } from '../types';
import { getTileKey } from '../types/viewport';
import { DurableObjectClient, type DOClientConfig } from './DurableObjectClient';
import { OfflineQueue } from './OfflineQueue';
import { strokeToDbRow } from './EventStream';
import type { DrawingEngine } from '../engine/DrawingEngine';

export type SyncStateListener = (state: SyncState) => void;

export interface SyncManagerConfig {
  /** Cloudflare DO WebSocket URL */
  doBaseUrl: string;
  /** Session token for authentication */
  accessToken: string;
  /** Current user ID */
  userId: string;
  /** API base URL for REST calls */
  apiBaseUrl?: string;
}

/**
 * SyncManager — orchestrates real-time sync and offline support.
 * Connects to Cloudflare DO for live broadcasting,
 * falls back to IndexedDB offline queue when disconnected.
 */
export class SyncManager {
  private doClient: DurableObjectClient;
  private offlineQueue: OfflineQueue;
  private engine: DrawingEngine | null = null;
  private apiBaseUrl: string;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private currentRoom: string | null = null;

  private stateListeners = new Set<SyncStateListener>();
  private unsubscribeEngine: (() => void) | null = null;
  private unsubscribeDoMessages: (() => void) | null = null;
  private unsubscribeDoState: (() => void) | null = null;

  constructor(config: SyncManagerConfig) {
    this.doClient = new DurableObjectClient({
      baseUrl: config.doBaseUrl,
      accessToken: config.accessToken,
      userId: config.userId,
    });
    this.offlineQueue = new OfflineQueue();
    this.apiBaseUrl = config.apiBaseUrl ?? '/api';

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /** Bind to a DrawingEngine to auto-sync stroke events */
  bindEngine(engine: DrawingEngine): void {
    this.engine = engine;

    // Listen for engine events
    this.unsubscribeEngine = engine.subscribe((event) => {
      if (event.type === 'stroke:end') {
        this.broadcastStroke(event.stroke);
      } else if (event.type === 'stroke:deleted') {
        this.broadcastDelete(event.strokeId);
      }
    });

    // Listen for incoming DO messages
    this.unsubscribeDoMessages = this.doClient.onMessage((event) => {
      this.handleRemoteEvent(event);
    });

    // Listen for DO connection state changes
    this.unsubscribeDoState = this.doClient.onStateChange((state) => {
      this.stateListeners.forEach((l) => l(state));

      if (state === 'connected') {
        this.flushOfflineQueue();
      }
    });
  }

  /** Join a room based on viewport center */
  joinRoom(centerLat: number, centerLng: number): void {
    const room = getTileKey(centerLat, centerLng, 14);
    if (room === this.currentRoom) return;

    this.currentRoom = room;

    if (this.isOnline) {
      this.doClient.connect(room);
    }
  }

  /** Load strokes for a viewport from the REST API */
  async loadViewport(bounds: GeoBounds, zoom: number): Promise<StrokeData[]> {
    try {
      const params = new URLSearchParams({
        minLat: bounds.minLat.toString(),
        maxLat: bounds.maxLat.toString(),
        minLng: bounds.minLng.toString(),
        maxLng: bounds.maxLng.toString(),
        zoom: zoom.toString(),
      });

      const res = await fetch(`${this.apiBaseUrl}/drawings?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[SyncManager] Failed to load viewport:', e);
      return [];
    }
  }

  /** Get current sync state */
  getState(): SyncState {
    return this.doClient.getState();
  }

  /** Subscribe to state changes */
  onStateChange(listener: SyncStateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /** Update access token */
  updateToken(token: string): void {
    this.doClient.updateToken(token);
  }

  /** Clean up everything */
  dispose(): void {
    this.unsubscribeEngine?.();
    this.unsubscribeDoMessages?.();
    this.unsubscribeDoState?.();
    this.doClient.dispose();

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }

    this.stateListeners.clear();
    this.engine = null;
  }

  // ========================
  // Internals
  // ========================

  private broadcastStroke(stroke: StrokeData): void {
    const event: DrawEvent = { type: 'STROKE_ADD', stroke };

    // 1) Always persist to D1 via REST API (primary persistence)
    this.persistStrokeToApi(stroke);

    // 2) Broadcast to DO for real-time sync with other users
    if (this.isOnline && this.doClient.getState() === 'connected') {
      const sent = this.doClient.send(event);
      if (!sent) {
        this.offlineQueue.enqueue(event);
      }
    } else {
      this.offlineQueue.enqueue(event);
    }
  }

  /** Persist a stroke to D1 via POST /api/drawings */
  private async persistStrokeToApi(stroke: StrokeData): Promise<void> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/drawings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stroke),
      });
      if (!res.ok) {
        console.error('[SyncManager] Failed to persist stroke:', res.status);
      }
    } catch (e) {
      console.error('[SyncManager] Failed to persist stroke:', e);
    }
  }

  private broadcastDelete(strokeId: string): void {
    const event: DrawEvent = {
      type: 'STROKE_DELETE',
      strokeId,
      userId: this.engine?.['userId'] ?? '',
    };

    // Persist deletion to D1 via REST API
    this.deleteStrokeFromApi(strokeId);

    if (this.isOnline && this.doClient.getState() === 'connected') {
      this.doClient.send(event);
    } else {
      this.offlineQueue.enqueue(event);
    }
  }

  /** Delete a stroke from D1 via DELETE /api/drawings */
  private async deleteStrokeFromApi(strokeId: string): Promise<void> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/drawings/${encodeURIComponent(strokeId)}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 404) {
        console.error('[SyncManager] Failed to delete stroke:', res.status);
      }
    } catch (e) {
      console.error('[SyncManager] Failed to delete stroke:', e);
    }
  }

  private handleRemoteEvent(event: DrawEvent): void {
    if (!this.engine) return;

    switch (event.type) {
      case 'STROKE_ADD':
        this.engine.addExternalStroke(event.stroke);
        break;
      case 'STROKE_DELETE':
        this.engine.strokes.remove(event.strokeId);
        break;
    }
  }

  private async flushOfflineQueue(): Promise<void> {
    if (!this.offlineQueue.hasEvents) return;

    const events = await this.offlineQueue.drain();
    for (const event of events) {
      this.doClient.send(event);
    }
  }

  private handleOnline = (): void => {
    this.isOnline = true;
    if (this.currentRoom) {
      this.doClient.connect(this.currentRoom);
    }
  };

  private handleOffline = (): void => {
    this.isOnline = false;
  };
}
