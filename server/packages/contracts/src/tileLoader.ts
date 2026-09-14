import type { GeoBounds, StrokeData } from './types';
import type { PageCursor, TilePage } from './protocol';
import { tileKeysForBounds, parseTileKey, TILE_SYNC_ZOOM } from './tileSync';

type Entry = { items: StrokeData[]; cursor: PageCursor | null; loadedAt: number; complete: boolean; previousIds: Set<string>; limited: boolean };
export type TileFetcher = (tile: { z: number; x: number; y: number }, cursor: PageCursor | null, signal: AbortSignal) => Promise<TilePage>;

/** Bounded, framework-independent loader. Cache data and freshness together:
 * returning to an evicted viewport must never leave an apparently loaded hole.
 * Only a complete, successful snapshot can confirm a remote deletion.
 */
export class ViewportTileLoader {
  private entries = new Map<string, Entry>();
  private controller: AbortController | null = null;
  private removed = new Set<string>();
  truncated = false;

  constructor(private fetchPage: TileFetcher, private expiration = 30_000, private zoom = TILE_SYNC_ZOOM) {}

  cancelInFlight(): void { this.controller?.abort(); this.controller = null; }
  clearCache(): void { this.cancelInFlight(); this.entries.clear(); this.removed.clear(); }
  takeRemovedIds(): string[] { const ids = [...this.removed]; this.removed.clear(); return ids; }

  async fetchMissingTiles(bounds: GeoBounds): Promise<StrokeData[]> {
    this.cancelInFlight();
    const controller = new AbortController();
    this.controller = controller;
    let keys: string[];
    try { keys = tileKeysForBounds(bounds, this.zoom); } catch { this.truncated = true; return []; }
    // A camera movement cancels all pending work. No more than four network
    // requests run together, and each tile receives one bounded page per pass.
    const output = new Map<string, StrokeData>();
    let outputPoints = 0;
    let next = 0;
    this.truncated = false;
    const workers = Array.from({ length: Math.min(4, keys.length) }, async () => {
      while (next < keys.length && !controller.signal.aborted && outputPoints < 150_000) {
        const key = keys[next++];
        const old = this.entries.get(key);
        let entry = old;
        const fresh = old && Date.now() - old.loadedAt < this.expiration;
        if (!fresh || !old.complete) {
          const cursor = old && !old.complete ? old.cursor : null;
          try {
            const page = await this.fetchPage(parseTileKey(key)!, cursor, controller.signal);
            if (controller.signal.aborted) return;
            const combined = new Map((cursor ? old?.items ?? [] : []).map(s => [s.id, s]));
            let pointCount = [...combined.values()].reduce((n, s) => n + s.points.length, 0);
            let overflow = false;
            for (const stroke of page.items) {
              if (combined.has(stroke.id)) continue;
              if (pointCount + stroke.points.length > 50_000 || combined.size >= 2500) { overflow = true; break; }
              combined.set(stroke.id, stroke);
              pointCount += stroke.points.length;
            }
            const complete = !page.nextCursor && !overflow;
            // Only compare a first-page complete snapshot. Partial snapshots must
            // never make old content disappear as if it had been deleted.
            const previousIds = cursor ? old!.previousIds : new Set(old?.items.map(s => s.id));
            if (complete) {
              for (const id of previousIds) if (!combined.has(id)) this.removed.add(id);
            }
            entry = { items: [...combined.values()], cursor: overflow ? null : page.nextCursor, complete: complete || overflow, loadedAt: Date.now(), previousIds, limited: overflow };
            if (overflow || page.nextCursor) this.truncated = true;
            this.entries.delete(key);
            this.entries.set(key, entry);
          } catch {
            // A failed tile does not discard other successful tiles or become fresh.
            this.truncated = true;
          }
        }
        if (entry?.limited || entry?.cursor) this.truncated = true;
        for (const stroke of entry?.items ?? []) {
          if (!output.has(stroke.id)) outputPoints += stroke.points.length;
          output.set(stroke.id, stroke);
        }
      }
    });
    await Promise.all(workers);
    if (next < keys.length) this.truncated = true;
    if (controller.signal.aborted) return [];
    const visible = new Set(keys);
    let cachePoints = [...this.entries.values()].reduce((n, e) => n + e.items.reduce((m, s) => m + s.points.length, 0), 0);
    const evictionOrder = [...this.entries].sort(([a], [b]) => Number(visible.has(a)) - Number(visible.has(b)));
    for (const [key, entry] of evictionOrder) {
      if (this.entries.size <= 64 && cachePoints <= 150_000) break;
      cachePoints -= entry.items.reduce((n, s) => n + s.points.length, 0);
      this.entries.delete(key);
    }
    // Visible data is also budgeted: never decode an unbounded global history.
    let points = 0;
    const result: StrokeData[] = [];
    for (const stroke of output.values()) {
      if (points + stroke.points.length > 150_000) { this.truncated = true; break; }
      result.push(stroke); points += stroke.points.length;
    }
    if (this.controller === controller) this.controller = null;
    return result;
  }
}
