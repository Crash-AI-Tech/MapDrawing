import type { DrawEvent, StrokeData } from '../types';
import { get, set, del, keys } from 'idb-keyval';

const STORE_PREFIX = 'map_offline_';
const QUEUE_KEY = `${STORE_PREFIX}queue`;

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

  /** Load the queue from IndexedDB */
  async load(): Promise<void> {
    try {
      const stored = await get<QueueItem[]>(QUEUE_KEY);
      this.queue = stored ?? [];
      this.loaded = true;
    } catch {
      this.queue = [];
      this.loaded = true;
    }
  }

  /** Add an event to the offline queue */
  async enqueue(event: DrawEvent): Promise<void> {
    if (!this.loaded) await this.load();

    const item: QueueItem = {
      id: crypto.randomUUID(),
      event,
      timestamp: Date.now(),
    };

    this.queue.push(item);
    await this.persist();
  }

  /** Get all queued events, sorted by timestamp */
  async drain(): Promise<DrawEvent[]> {
    if (!this.loaded) await this.load();

    const events = this.queue
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => item.event);

    this.queue = [];
    await this.persist();

    return events;
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
    await del(QUEUE_KEY);
  }

  private async persist(): Promise<void> {
    try {
      await set(QUEUE_KEY, this.queue);
    } catch (e) {
      console.error('[OfflineQueue] Failed to persist:', e);
    }
  }
}
