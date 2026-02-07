import type { StrokeData, GeoBounds } from '../types';
import type { BrushRegistry } from '../brushes';

/**
 * TileCache — caches rendered stroke tiles as bitmaps.
 * Avoids re-drawing all historical strokes every frame.
 */
export class TileCache {
  private cache = new Map<string, ImageBitmap>();
  private dirtyTiles = new Set<string>();
  private tileSize: number;

  constructor(tileSize: number = 512) {
    this.tileSize = tileSize;
  }

  /** Get a cached tile bitmap */
  get(tileKey: string): ImageBitmap | undefined {
    return this.cache.get(tileKey);
  }

  /** Mark a tile as dirty (needs re-render) */
  invalidate(tileKey: string): void {
    this.dirtyTiles.add(tileKey);
  }

  /** Check if a tile needs re-rendering */
  isDirty(tileKey: string): boolean {
    return this.dirtyTiles.has(tileKey) || !this.cache.has(tileKey);
  }

  /** Render and cache a tile */
  async renderTile(
    tileKey: string,
    strokes: StrokeData[],
    brushRegistry: BrushRegistry,
    transform: (geoX: number, geoY: number) => { x: number; y: number }
  ): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(this.tileSize, this.tileSize);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create offscreen canvas context');

    // Render each stroke
    for (const stroke of strokes) {
      const brush = brushRegistry.get(stroke.brushId);
      if (!brush) continue;

      // Transform geo points to tile-local pixel coordinates
      const transformedStroke: StrokeData = {
        ...stroke,
        points: stroke.points.map((p) => {
          const { x, y } = transform(p.x, p.y);
          return { ...p, x, y };
        }),
      };

      brush.renderFullStroke(ctx as unknown as CanvasRenderingContext2D, transformedStroke);
    }

    const bitmap = await createImageBitmap(canvas);
    this.cache.set(tileKey, bitmap);
    this.dirtyTiles.delete(tileKey);
    return bitmap;
  }

  /** Remove a tile from cache */
  remove(tileKey: string): void {
    const bitmap = this.cache.get(tileKey);
    if (bitmap) {
      bitmap.close();
      this.cache.delete(tileKey);
    }
    this.dirtyTiles.delete(tileKey);
  }

  /** Clear all cached tiles */
  clear(): void {
    for (const bitmap of this.cache.values()) {
      bitmap.close();
    }
    this.cache.clear();
    this.dirtyTiles.clear();
  }

  /** Get the number of cached tiles */
  get size(): number {
    return this.cache.size;
  }

  /** Evict tiles outside the given bounds to save memory */
  evictOutsideBounds(
    visibleTileKeys: Set<string>,
    maxCacheSize: number = 200
  ): void {
    if (this.cache.size <= maxCacheSize) return;

    const toRemove: string[] = [];
    for (const key of this.cache.keys()) {
      if (!visibleTileKeys.has(key)) {
        toRemove.push(key);
      }
    }

    // Remove oldest first (Map preserves insertion order)
    for (const key of toRemove) {
      if (this.cache.size <= maxCacheSize) break;
      this.remove(key);
    }
  }
}
