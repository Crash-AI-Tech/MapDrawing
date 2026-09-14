import type { DrawEvent, StrokeData, SyncState } from './types';
import type { SaveDrawingsResponse } from './protocol';

export interface DurableEventQueue {
  enqueue(event: DrawEvent): Promise<void>;
  peek(): Promise<DrawEvent[]>;
  removeProcessed(count: number): Promise<void>;
}

/** Only adjacent adds can be batched: an undo must never overtake its save. */
export function nextWriteBatch(events: DrawEvent[]): DrawEvent[] {
  if (events[0]?.type !== 'STROKE_ADD') return events.slice(0, 1);
  const result: DrawEvent[] = [];
  let bytes = 2;
  const ids = new Set<string>();
  for (const event of events) {
    if (event.type !== 'STROKE_ADD' || result.length === 8 || ids.has(event.stroke.id)) break;
    const size = new TextEncoder().encode(JSON.stringify(event.stroke)).length + 1;
    if (result.length && bytes + size > 512_000) break;
    result.push(event); ids.add(event.stroke.id); bytes += size;
  }
  return result;
}

export class DurableWriter {
  private disposed = false;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private enqueuing: Promise<void> = Promise.resolve();
  private retry = 0;
  private pending = new Set<string>();
  private deleted = new Set<string>();
  private listeners = new Set<(state: SyncState) => void>();
  private state: SyncState = 'connecting';

  constructor(private options: {
    queue: DurableEventQueue;
    save: (strokes: StrokeData[]) => Promise<SaveDrawingsResponse>;
    remove: (id: string) => Promise<void>;
    retryable: (error: unknown) => boolean;
    authBlocked?: (error: unknown) => boolean;
    onInk?: (ink: number) => void;
    onRejected?: (id: string) => void;
    onSaved?: () => void;
  }) { this.schedule(700); }

  getState(): SyncState { return this.state; }
  isPending(id: string): boolean { return this.pending.has(id); }
  /** A stale viewport page must not resurrect an acknowledged local deletion. */
  shouldIgnoreRemote(id: string): boolean { return this.pending.has(id) || this.deleted.has(id); }
  onStateChange(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener); listener(this.state); return () => { this.listeners.delete(listener); };
  }
  enqueue(event: DrawEvent): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (event.type === 'STROKE_ADD') { this.pending.add(event.stroke.id); this.deleted.delete(event.stroke.id); }
    if (event.type === 'STROKE_DELETE') { this.pending.add(event.strokeId); this.deleted.add(event.strokeId); }
    this.setState('connecting');
    this.enqueuing = this.enqueuing.catch(() => undefined).then(() => this.options.queue.enqueue(event));
    return this.enqueuing.then(() => this.schedule(700)).catch(() => { this.setState('error'); });
  }
  dispose(): void { this.disposed = true; if (this.timer) clearTimeout(this.timer); this.listeners.clear(); }
  private setState(state: SyncState): void { if (!this.disposed) { this.state = state; for (const listener of this.listeners) listener(state); } }
  private schedule(ms: number): void {
    if (this.disposed || this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, ms);
  }
  private async send(batch: DrawEvent[]): Promise<void> {
    if (batch[0]?.type === 'STROKE_ADD') {
      const strokes = batch.flatMap(e => e.type === 'STROKE_ADD' ? [e.stroke] : []);
      const result = await this.options.save(strokes);
      if (!this.disposed && typeof result.ink === 'number') this.options.onInk?.(result.ink);
      if (!this.disposed) this.options.onSaved?.();
    } else if (batch[0]?.type === 'STROKE_DELETE') await this.options.remove(batch[0].strokeId);
  }
  private async flush(): Promise<void> {
    if (this.disposed || this.running) return;
    this.running = true;
    let rejected = false;
    try {
      await this.enqueuing;
      let events = await this.options.queue.peek();
      const locallyQueued = new Set(this.pending);
      for (const event of events) {
        // Restore old persisted operations, but never overwrite a newer local
        // undo/redo that arrived while the storage read was in progress.
        if (event.type === 'STROKE_ADD') { this.pending.add(event.stroke.id); if (!locallyQueued.has(event.stroke.id)) this.deleted.delete(event.stroke.id); }
        if (event.type === 'STROKE_DELETE') { this.pending.add(event.strokeId); if (!locallyQueued.has(event.strokeId)) this.deleted.add(event.strokeId); }
      }
      while (events.length && !this.disposed) {
        this.setState('connecting');
        let batch = nextWriteBatch(events);
        try { await this.send(batch); }
        catch (error) {
          if (this.options.authBlocked?.(error)) { this.setState('error'); return; }
          if (this.options.retryable(error)) throw error;
          if (batch.length > 1) {
            batch = batch.slice(0, 1);
            try { await this.send(batch); }
            catch (singleError) {
              if (this.options.authBlocked?.(singleError)) { this.setState('error'); return; }
              if (this.options.retryable(singleError)) throw singleError;
              rejected = true;
              if (!this.disposed && batch[0].type === 'STROKE_ADD') this.options.onRejected?.(batch[0].stroke.id);
            }
          } else {
            rejected = true;
            if (!this.disposed && batch[0].type === 'STROKE_ADD') this.options.onRejected?.(batch[0].stroke.id);
          }
        }
        await this.options.queue.removeProcessed(batch.length);
        this.retry = 0;
        await this.enqueuing;
        events = await this.options.queue.peek();
        this.pending = new Set(events.flatMap(e => e.type === 'STROKE_ADD' ? [e.stroke.id] : e.type === 'STROKE_DELETE' ? [e.strokeId] : []));
      }
      if (!events.length) this.setState(rejected ? 'error' : 'connected');
    } catch {
      this.setState('disconnected');
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      this.schedule(Math.min(60_000, 2000 * 2 ** Math.min(this.retry++, 5)) + Math.random() * 1000);
    } finally { this.running = false; }
  }
}
