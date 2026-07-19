import type { DrawEvent } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    parseOfflineQueue,
    OFFLINE_QUEUE_VERSION,
    type OfflineQueueItem,
} from '@niubi/shared';

const QUEUE_KEY_PREFIX = 'offline_queue_v2';

/**
 * OfflineQueue — stores events when disconnected.
 * Backed by AsyncStorage for persistence across app restarts.
 */
export class OfflineQueue {
    private queue: OfflineQueueItem[] = [];
    private isLoaded = false;
    private loadPromise: Promise<void>;
    private storageKey: string;

    constructor(userId: string) {
        // Never replay one account's writes after another account signs in.
        this.storageKey = `${QUEUE_KEY_PREFIX}:${userId}`;
        this.loadPromise = this.load();
    }

    async load(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(this.storageKey);
            if (stored) {
                this.queue = parseOfflineQueue(JSON.parse(stored));
            }
        } catch (e) {
            console.error('[OfflineQueue] Failed to load queue:', e);
        } finally {
            this.isLoaded = true;
        }
    }

    async enqueue(event: DrawEvent): Promise<void> {
        await this.ensureLoaded();
        this.queue.push({
            version: OFFLINE_QUEUE_VERSION,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            event,
            createdAt: Date.now(),
            attempts: 0,
        });
        await this.save();
    }

    async peek(): Promise<DrawEvent[]> {
        await this.ensureLoaded();
        return [...this.queue]
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((item) => item.event);
    }

    async removeProcessed(count: number): Promise<void> {
        await this.ensureLoaded();
        this.queue.sort((a, b) => a.createdAt - b.createdAt);
        this.queue = this.queue.slice(Math.max(0, count));
        await this.save();
    }

    get hasEvents(): boolean {
        return this.queue.length > 0;
    }

    get size(): number {
        return this.queue.length;
    }

    async clear(): Promise<void> {
        await this.ensureLoaded();
        this.queue = [];
        await AsyncStorage.removeItem(this.storageKey);
    }

    private async save(): Promise<void> {
        try {
            await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.queue));
        } catch (e) {
            console.error('[OfflineQueue] Failed to save queue:', e);
        }
    }

    private async ensureLoaded(): Promise<void> {
        if (!this.isLoaded) await this.loadPromise;
    }
}
