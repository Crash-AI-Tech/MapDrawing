import type { DrawEvent } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_queue';

/**
 * OfflineQueue — stores events when disconnected.
 * Backed by AsyncStorage for persistence across app restarts.
 */
export class OfflineQueue {
    private queue: DrawEvent[] = [];
    private isLoaded = false;

    constructor() {
        this.load();
    }

    async load(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(QUEUE_KEY);
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
        this.queue.push(event);
        await this.save();
    }

    async drain(): Promise<DrawEvent[]> {
        if (this.queue.length === 0) return [];

        const events = [...this.queue];
        this.queue = [];
        await this.save();
        return events;
    }

    get hasEvents(): boolean {
        return this.queue.length > 0;
    }

    get size(): number {
        return this.queue.length;
    }

    private async save(): Promise<void> {
        try {
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
        } catch (e) {
            console.error('[OfflineQueue] Failed to save queue:', e);
        }
    }
}
