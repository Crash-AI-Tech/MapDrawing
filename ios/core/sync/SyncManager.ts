import { OfflineQueue } from './OfflineQueue';
import { ApiError, saveDrawings, deleteStroke } from '../../lib/api';
import type { StrokeData, DrawEvent, SyncState } from '../types';
import { shouldRetryHttpStatus } from '@niubi/shared';

export type SyncStateListener = (state: SyncState) => void;

interface SyncManagerConfig {
    userId: string;
    onRemoteStroke?: (stroke: StrokeData) => void;
    onRemoteDelete?: (strokeId: string) => void;
    onInkBalance?: (ink: number) => void;
    onStrokeRejected?: (strokeId: string) => void;
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
    private isFlushing = false;
    private onInkBalance?: (ink: number) => void;
    private onStrokeRejected?: (strokeId: string) => void;

    constructor(config: SyncManagerConfig) {
        this.userId = config.userId;
        this.offlineQueue = new OfflineQueue(config.userId);
        this.onInkBalance = config.onInkBalance;
        this.onStrokeRejected = config.onStrokeRejected;

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
            const response = await saveDrawings(stroke);
            if (typeof response.ink === 'number') this.onInkBalance?.(response.ink);
            this.setState('connected');
        } catch (e) {
            if (!this.shouldRetry(e)) {
                this.onStrokeRejected?.(stroke.id);
                this.setState(e instanceof ApiError && e.status === 401 ? 'error' : 'connected');
                return;
            }
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
            if (!this.shouldRetry(e)) {
                // A missing stroke is already deleted; other 4xx responses are permanent.
                this.setState(e instanceof ApiError && e.status === 401 ? 'error' : 'connected');
                return;
            }
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
        if (this.isFlushing) return;
        this.isFlushing = true;

        try {
            const events = await this.offlineQueue.peek();
            if (events.length === 0) return;
            let processedCount = 0;
            for (const event of events) {
                try {
                    if (event.type === 'STROKE_ADD' && event.stroke) {
                        const response = await saveDrawings(event.stroke);
                        if (typeof response.ink === 'number') this.onInkBalance?.(response.ink);
                    } else if (event.type === 'STROKE_DELETE') {
                        await deleteStroke(event.strokeId);
                    }
                    processedCount += 1;
                } catch (e) {
                    if (!this.shouldRetry(e)) {
                        if (event.type === 'STROKE_ADD') {
                            this.onStrokeRejected?.(event.stroke.id);
                        }
                        processedCount += 1;
                        continue;
                    }
                    console.error('[SyncManager] Failed to flush offline event:', e);
                    break;
                }
            }
            if (processedCount > 0) {
                await this.offlineQueue.removeProcessed(processedCount);
            }
            if (processedCount === events.length) this.setState('connected');
        } finally {
            this.isFlushing = false;
        }
    }

    private shouldRetry(error: unknown): boolean {
        if (!(error instanceof ApiError)) return true;
        return shouldRetryHttpStatus(error.status);
    }
}
