import { OfflineQueue } from './OfflineQueue';
import { saveDrawings, deleteStroke } from '../../lib/api';
import type { StrokeData, DrawEvent, SyncState } from '../types';

export type SyncStateListener = (state: SyncState) => void;

interface SyncManagerConfig {
    userId: string;
    onRemoteStroke?: (stroke: StrokeData) => void;
    onRemoteDelete?: (strokeId: string) => void;
}

/**
 * SyncManager — Persistence manager for local strokes.
 * - Saves strokes to API (via fetch)
 * - Handles offline queuing (retry later)
 * - Tracks connectivity state and notifies listeners
 */
export class SyncManager {
    private offlineQueue: OfflineQueue;
    private userId: string;
    private state: SyncState = 'connected';
    private stateListeners = new Set<SyncStateListener>();
    private flushTimer: ReturnType<typeof setInterval> | null = null;

    constructor(config: SyncManagerConfig) {
        this.userId = config.userId;
        this.offlineQueue = new OfflineQueue();

        // Simple retry mechanism
        this.flushTimer = setInterval(() => {
            this.flushOfflineQueue();
        }, 10000);
    }

    /**
     * Broadcast a locally created stroke.
     * 1. Save to API (Persistence)
     * 2. Enqueue if failed
     */
    async broadcastStroke(stroke: StrokeData): Promise<void> {
        const event: DrawEvent = { type: 'STROKE_ADD', stroke };

        try {
            this.setState('connecting');
            await saveDrawings(stroke);
            this.setState('connected');
        } catch (e) {
            console.warn('[SyncManager] Failed to save stroke, queuing:', e);
            this.setState('disconnected');
            await this.offlineQueue.enqueue(event);
        }
    }

    /**
     * Broadcast a local deletion.
     */
    async broadcastDelete(strokeId: string): Promise<void> {
        const event: DrawEvent = {
            type: 'STROKE_DELETE',
            strokeId,
            userId: this.userId,
        };

        try {
            this.setState('connecting');
            await deleteStroke(strokeId);
            this.setState('connected');
        } catch (e) {
            console.warn('[SyncManager] Failed to delete stroke, queuing:', e);
            this.setState('disconnected');
            await this.offlineQueue.enqueue(event);
        }
    }

    // No-op for tile-based sync compatibility
    joinRoom(_lat: number, _lng: number): void {
        // do nothing
    }

    getState(): SyncState {
        return this.state;
    }

    onStateChange(listener: SyncStateListener): () => void {
        this.stateListeners.add(listener);
        listener(this.state);
        return () => { this.stateListeners.delete(listener); };
    }

    updateToken(token: string): void {
        // Handled by api.ts / SecureStore
    }

    dispose(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        this.stateListeners.clear();
    }

    private setState(newState: SyncState): void {
        if (this.state !== newState) {
            this.state = newState;
            for (const listener of this.stateListeners) {
                listener(newState);
            }
        }
    }

    private async flushOfflineQueue(): Promise<void> {
        if (!this.offlineQueue.hasEvents) return;

        const events = await this.offlineQueue.drain();
        for (const event of events) {
            try {
                if (event.type === 'STROKE_ADD' && event.stroke) {
                    await saveDrawings(event.stroke);
                } else if (event.type === 'STROKE_DELETE') {
                    await deleteStroke(event.strokeId);
                }
            } catch (e) {
                console.error('[SyncManager] Failed to flush offline event:', e);
                return; // Stop flushing, stay offline
            }
        }
        // All flushed successfully → back online
        this.setState('connected');
    }
}
