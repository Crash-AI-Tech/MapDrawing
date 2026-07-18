import type { StrokeData, GeoBounds, StrokeRTreeItem } from '../types';
import RBush from 'rbush';

/**
 * StrokeManager — manages stroke data with spatial indexing (R-tree).
 * Pure TypeScript, no framework dependencies.
 */
export class StrokeManager {
  /** All strokes keyed by ID */
  private strokes = new Map<string, StrokeData>();
  /** R-tree for spatial queries */
  private rtree = new RBush<StrokeRTreeItem>();
  /** Track which items are in the tree for removal */
  private rtreeItems = new Map<string, StrokeRTreeItem>();

  /** Add a stroke */
  add(stroke: StrokeData): void {
    if (this.strokes.has(stroke.id)) return;
    this.strokes.set(stroke.id, stroke);
    const item = this.toRTreeItem(stroke);
    this.rtreeItems.set(stroke.id, item);
    this.rtree.insert(item);
  }

  /** Remove a stroke by ID */
  remove(strokeId: string): StrokeData | undefined {
    const stroke = this.strokes.get(strokeId);
    if (!stroke) return undefined;

    this.strokes.delete(strokeId);
    const item = this.rtreeItems.get(strokeId);
    if (item) {
      this.rtree.remove(item, (a, b) => a.strokeId === b.strokeId);
      this.rtreeItems.delete(strokeId);
    }
    return stroke;
  }

  /** Get a stroke by ID */
  get(strokeId: string): StrokeData | undefined {
    return this.strokes.get(strokeId);
  }

  /** Get all strokes within a geographic bounding box */
  queryByBounds(bounds: GeoBounds): StrokeData[] {
    const results = this.rtree.search({
      minX: bounds.minLng,
      minY: bounds.minLat,
      maxX: bounds.maxLng,
      maxY: bounds.maxLat,
    });

    return results
      .map((item) => this.strokes.get(item.strokeId))
      .filter((s): s is StrokeData => s !== undefined);
  }

  /** Get all strokes by a specific user */
  queryByUser(userId: string): StrokeData[] {
    const result: StrokeData[] = [];
    for (const stroke of this.strokes.values()) {
      if (stroke.userId === userId) result.push(stroke);
    }
    return result;
  }

  /** Get all stroke IDs */
  getAllIds(): string[] {
    return [...this.strokes.keys()];
  }

  /** Get total count of strokes */
  get count(): number {
    return this.strokes.size;
  }

  /** Remove cached strokes authored by locally blocked users. */
  removeByUsers(userIds: ReadonlySet<string>): number {
    if (userIds.size === 0) return 0;
    const ids = [...this.strokes.values()]
      .filter((stroke) => userIds.has(stroke.userId))
      .map((stroke) => stroke.id);
    for (const id of ids) this.remove(id);
    return ids.length;
  }

  /**
   * Bound exploration memory by evicting oldest strokes outside the current
   * viewport. Visible content is never removed by this method.
   */
  evictOutsideBounds(bounds: GeoBounds, maxCount: number): number {
    if (this.strokes.size <= maxCount) return 0;
    const outside = [...this.strokes.values()]
      .filter((stroke) =>
        stroke.bounds.maxLng < bounds.minLng ||
        stroke.bounds.minLng > bounds.maxLng ||
        stroke.bounds.maxLat < bounds.minLat ||
        stroke.bounds.minLat > bounds.maxLat
      )
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));

    let removed = 0;
    for (const stroke of outside) {
      if (this.strokes.size <= maxCount) break;
      if (this.remove(stroke.id)) removed += 1;
    }
    return removed;
  }

  /** Load multiple strokes at once (bulk insert) */
  bulkLoad(strokes: StrokeData[]): void {
    const items: StrokeRTreeItem[] = [];
    for (const stroke of strokes) {
      if (this.strokes.has(stroke.id)) continue;
      this.strokes.set(stroke.id, stroke);
      const item = this.toRTreeItem(stroke);
      this.rtreeItems.set(stroke.id, item);
      items.push(item);
    }
    this.rtree.load(items);
  }

  /** Clear all data */
  clear(): void {
    this.strokes.clear();
    this.rtreeItems.clear();
    this.rtree.clear();
  }

  /** Convert StrokeData bounds to R-tree item */
  private toRTreeItem(stroke: StrokeData): StrokeRTreeItem {
    return {
      minX: stroke.bounds.minLng,
      minY: stroke.bounds.minLat,
      maxX: stroke.bounds.maxLng,
      maxY: stroke.bounds.maxLat,
      strokeId: stroke.id,
    };
  }
}
