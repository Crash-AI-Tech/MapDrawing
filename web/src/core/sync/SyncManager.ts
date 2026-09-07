import { DurableWriter, shouldRetryHttpStatus, type SyncState } from '@niubi/shared';
import { OfflineQueue } from './OfflineQueue';
import type { DrawingEngine } from '../engine/DrawingEngine';

class ApiSyncError extends Error { constructor(readonly status: number) { super(`HTTP ${status}`); } }
export interface SyncManagerConfig { userId: string; accessToken: string; apiBaseUrl?: string }
export type SyncStateListener = (state: SyncState) => void;

export class SyncManager extends DurableWriter {
  private engine: DrawingEngine | null = null;
  private unsubscribe: (() => void) | null = null;
  private userId: string;
  constructor(config: SyncManagerConfig) {
    const api = config.apiBaseUrl ?? '/api';
    super({
      queue: new OfflineQueue(config.userId),
      save: async (strokes) => {
        const response = await fetch(`${api}/drawings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Map-User': config.userId }, body: JSON.stringify(strokes) });
        if (!response.ok) throw new ApiSyncError(response.status);
        return response.json();
      },
      remove: async (id) => {
        const response = await fetch(`${api}/drawings/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Map-User': config.userId } });
        if (!response.ok && response.status !== 404) throw new ApiSyncError(response.status);
      },
      retryable: (error) => !(error instanceof ApiSyncError) || shouldRetryHttpStatus(error.status),
      authBlocked: error => error instanceof ApiSyncError && (error.status === 401 || error.status === 403),
      onInk: (ink) => this.engine?.inkManager.reconcile(ink),
      onRejected: (id) => this.engine?.rejectStroke(id),
    });
    this.userId = config.userId;
  }
  bindEngine(engine: DrawingEngine): void {
    this.engine = engine;
    this.unsubscribe = engine.subscribe(event => {
      if (event.type === 'stroke:end' || event.type === 'stroke:added') {
        // Loading remote strokes is not a local write.
        if (event.stroke.userId === this.userId) void this.enqueue({ type: 'STROKE_ADD', stroke: event.stroke });
      } else if (event.type === 'stroke:deleted') void this.enqueue({ type: 'STROKE_DELETE', strokeId: event.strokeId, userId: this.userId });
    });
  }
  override dispose(): void { this.unsubscribe?.(); this.engine = null; super.dispose(); }
}
