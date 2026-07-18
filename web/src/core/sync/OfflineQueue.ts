import type { DrawEvent } from '../types';
import { get, set, del } from 'idb-keyval';

const STORE_PREFIX = 'map_offline_';

interface QueueItem {
  id: string;
  event: DrawEvent;
  timestamp: number;
}

/**
 * OfflineQueue — stores draw events in IndexedDB when the user is offline.
 * Events are queued and flushed to the server when connectivity is restored.
 */
export class OfflineQueue {
  private queue: QueueItem[] = [];
  private loaded = false;
  private queueKey: string;
  private loadPromise: Promise<void>;

  constructor(userId: string) {
    // An offline write must never be replayed under a different signed-in user.
    this.queueKey = `${STORE_PREFIX}queue_${userId}`;
    this.loadPromise = this.load();
  }

  /** Load the queue from IndexedDB */
  async load(): Promise<void> {
    try {
      const stored = await get<QueueItem[]>(this.queueKey);
      this.queue = stored ?? [];
      this.loaded = true;
    } catch {
      this.queue = [];
      this.loaded = true;
    }
  }

  /** Add an event to the offline queue */
  async enqueue(event: DrawEvent): Promise<void> {
    await this.ensureLoaded();

    const item: QueueItem = {
      id: crypto.randomUUID(),
      event,
      timestamp: Date.now(),
    };

    this.queue.push(item);
    await this.persist();
  }

  /** Get all queued events sorted by timestamp without removing them */
  async peek(): Promise<DrawEvent[]> {
    await this.ensureLoaded();

    return this.queue
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => item.event);
  }

  /** Remove the first N processed events from the queue */
  async removeProcessed(count: number): Promise<void> {
    await this.ensureLoaded();
    this.queue.sort((a, b) => a.timestamp - b.timestamp);
    this.queue = this.queue.slice(count);
    await this.persist();
  }

  /** Get the number of queued events */
  get size(): number {
    return this.queue.length;
  }

  /** Check if there are queued events */
  get hasEvents(): boolean {
    return this.queue.length > 0;
  }

  /** Clear all queued events */
  async clear(): Promise<void> {
    this.queue = [];
    await del(this.queueKey);
  }

  private async persist(): Promise<void> {
    try {
      await set(this.queueKey, this.queue);
    } catch (e) {
      console.error('[OfflineQueue] Failed to persist:', e);
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.loadPromise;
  }
}
