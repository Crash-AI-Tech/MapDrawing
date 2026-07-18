import type { DrawEvent } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY_PREFIX = 'offline_queue';

/**
 * OfflineQueue — stores events when disconnected.
 * Backed by AsyncStorage for persistence across app restarts.
 */
export class OfflineQueue {
    private queue: DrawEvent[] = [];
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
                this.queue = JSON.parse(stored);
            }
        } catch (e) {
            console.error('[OfflineQueue] Failed to load queue:', e);
        } finally {
            this.isLoaded = true;
        }
    }

    async enqueue(event: DrawEvent): Promise<void> {
        await this.ensureLoaded();
        this.queue.push(event);
        await this.save();
    }

    async peek(): Promise<DrawEvent[]> {
        await this.ensureLoaded();
        return [...this.queue];
    }

    async removeProcessed(count: number): Promise<void> {
        await this.ensureLoaded();
        this.queue = this.queue.slice(Math.max(0, count));
        await this.save();
    }

    get hasEvents(): boolean {
        return this.queue.length > 0;
    }

    get size(): number {
        return this.queue.length;
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
