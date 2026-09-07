import { DurableWriter, shouldRetryHttpStatus, type StrokeData } from '@niubi/shared';
import { OfflineQueue } from './OfflineQueue';
import { ApiError, apiFetch } from '../../lib/api';

export class SyncManager extends DurableWriter {
  constructor(private config: { userId: string; token: string; onInkBalance?: (ink: number) => void; onStrokeRejected?: (id: string) => void }) {
    super({
      queue: new OfflineQueue(config.userId),
      save: strokes => apiFetch('/api/drawings', { method: 'POST', headers: { Authorization: `Bearer ${config.token}`, 'X-Map-User': config.userId }, body: JSON.stringify(strokes) }),
      remove: async id => { try { await apiFetch(`/api/drawings/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${config.token}`, 'X-Map-User': config.userId } }); } catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; } },
      retryable: error => !(error instanceof ApiError) || shouldRetryHttpStatus(error.status),
      authBlocked: error => error instanceof ApiError && (error.status === 401 || error.status === 403),
      onInk: config.onInkBalance,
      onRejected: config.onStrokeRejected,
    });
  }
  broadcastStroke(stroke: StrokeData): Promise<void> { return this.enqueue({ type: 'STROKE_ADD', stroke }); }
  broadcastDelete(strokeId: string): Promise<void> { return this.enqueue({ type: 'STROKE_DELETE', strokeId, userId: this.config.userId }); }
}
