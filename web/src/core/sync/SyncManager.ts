import type { DrawEvent, StrokeData, SyncState } from '../types';
import { shouldRetryHttpStatus } from '@niubi/shared';
import { OfflineQueue } from './OfflineQueue';
import type { DrawingEngine } from '../engine/DrawingEngine';

export type SyncStateListener = (state: SyncState) => void;

class ApiSyncError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }

  get retryable(): boolean {
    return shouldRetryHttpStatus(this.status);
  }
}

export interface SyncManagerConfig {
  /** Session token for authentication */
  accessToken: string;
  /** Current user ID */
  userId: string;
  /** API base URL for REST calls */
  apiBaseUrl?: string;
}

/**
 * SyncManager — manages persistence of local strokes to the backend.
 * Uses simple HTTP API (POST/DELETE) and an offline queue for retries.
 * (Real-time sync via WebSocket has been removed in favor of Tile-based polling).
 */
export class SyncManager {
  private offlineQueue: OfflineQueue;
  private engine: DrawingEngine | null = null;
  private apiBaseUrl: string;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private stateListeners = new Set<SyncStateListener>();
  private unsubscribeEngine: (() => void) | null = null;

  // Timer for retrying offline queue
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor(config: SyncManagerConfig) {
    this.offlineQueue = new OfflineQueue(config.userId);
    this.apiBaseUrl = config.apiBaseUrl ?? '/api';

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);

      // Try to flush queue periodically if online
      this.retryTimer = setInterval(() => {
        if (this.isOnline) this.flushOfflineQueue();
      }, 10000);
    }
  }

  /** Bind to a DrawingEngine to auto-sync stroke events */
  bindEngine(engine: DrawingEngine): void {
    this.engine = engine;

    // Listen for engine events
    this.unsubscribeEngine = engine.subscribe((event) => {
      if (event.type === 'stroke:end') {
        this.persistStroke(event.stroke);
      } else if (event.type === 'stroke:deleted') {
        this.persistDelete(event.strokeId);
      }
    });
  }

  /** Get current sync state */
  getState(): SyncState {
    return this.isOnline ? 'connected' : 'disconnected';
  }

  /** Subscribe to state changes */
  onStateChange(listener: SyncStateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /** Update access token */
  updateToken(_token: string): void {
    // We don't store token in class prop but if needed for headers in future
    // For now API calls rely on Cookies or we could add Authorization header logic here
  }

  /** Clean up everything */
  dispose(): void {
    this.unsubscribeEngine?.();
    if (this.retryTimer) clearInterval(this.retryTimer);

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

  private persistStroke(stroke: StrokeData): void {
    const event: DrawEvent = { type: 'STROKE_ADD', stroke };

    if (this.isOnline) {
      this.persistStrokeToApi(stroke).catch((error: unknown) => {
        if (error instanceof ApiSyncError && !error.retryable) {
          this.engine?.rejectStroke(stroke.id);
          return;
        }
        void this.offlineQueue.enqueue(event);
      });
    } else {
      void this.offlineQueue.enqueue(event);
    }
  }

  /** Persist a stroke to D1 via POST /api/drawings */
  private async persistStrokeToApi(stroke: StrokeData): Promise<void> {
    const res = await fetch(`${this.apiBaseUrl}/drawings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stroke),
    });
    if (!res.ok) throw new ApiSyncError(res.status);
    const data = await res.json() as { ink?: number };
    if (typeof data.ink === 'number') this.engine?.inkManager.reconcile(data.ink);
  }

  private persistDelete(strokeId: string): void {
    const event: DrawEvent = {
      type: 'STROKE_DELETE',
      strokeId,
      userId: this.engine?.['userId'] ?? '',
    };

    if (this.isOnline) {
      this.deleteStrokeFromApi(strokeId).catch((error: unknown) => {
        if (error instanceof ApiSyncError && !error.retryable) return;
        void this.offlineQueue.enqueue(event);
      });
    } else {
      void this.offlineQueue.enqueue(event);
    }
  }

  /** Delete a stroke from D1 via DELETE /api/drawings */
  private async deleteStrokeFromApi(strokeId: string): Promise<void> {
    const res = await fetch(`${this.apiBaseUrl}/drawings/${encodeURIComponent(strokeId)}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) {
      throw new ApiSyncError(res.status);
    }
  }

  private async flushOfflineQueue(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      const events = await this.offlineQueue.peek();
      if (events.length === 0) return;
      let processedCount = 0;

      for (const event of events) {
        try {
          if (event.type === 'STROKE_ADD' && event.stroke) {
            await this.persistStrokeToApi(event.stroke);
          } else if (event.type === 'STROKE_DELETE') {
            await this.deleteStrokeFromApi(event.strokeId);
          }
          processedCount++;
        } catch (e) {
          if (e instanceof ApiSyncError && !e.retryable) {
            if (event.type === 'STROKE_ADD') this.engine?.rejectStroke(event.stroke.id);
            processedCount++;
            continue;
          }
          // Stop processing on first failure — remaining events stay in queue
          console.error('[SyncManager] Failed to flush event, will retry later:', e);
          break;
        }
      }

      // Only remove successfully processed events
      if (processedCount > 0) {
        await this.offlineQueue.removeProcessed(processedCount);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  private handleOnline = (): void => {
    this.isOnline = true;
    this.notifyState('connected');
    this.flushOfflineQueue();
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    this.notifyState('disconnected');
  };

  private notifyState(state: SyncState) {
    this.stateListeners.forEach((l) => l(state));
  }
}
