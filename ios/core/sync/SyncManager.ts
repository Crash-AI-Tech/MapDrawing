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
 * - (Real-time sync removed)
 */
export class SyncManager {
    private offlineQueue: OfflineQueue;
    private userId: string;
    private isOnline = true; // Simple check, ideally verify with NetInfo

    constructor(config: SyncManagerConfig) {
        this.userId = config.userId;
        this.offlineQueue = new OfflineQueue();

        // Simple retry mechanism
        setInterval(() => {
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
            await saveDrawings(stroke);
        } catch (e) {
            console.warn('[SyncManager] Failed to save stroke, queuing:', e);
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
            await deleteStroke(strokeId);
        } catch (e) {
            console.warn('[SyncManager] Failed to delete stroke, queuing:', e);
            await this.offlineQueue.enqueue(event);
        }
    }

    // No-op for tile-based sync compatibility
    joinRoom(_lat: number, _lng: number): void {
        // do nothing
    }

    getState(): SyncState {
        return 'connected';
    }

    onStateChange(listener: SyncStateListener): () => void {
        // No real state change logic yet
        listener('connected');
        return () => { };
    }

    updateToken(token: string): void {
        // Handled by api.ts / SecureStore
    }

    dispose(): void {
        // Clean up
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
            }
        }
    }
}
