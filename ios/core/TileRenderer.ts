/**
 * TileRenderer — Spatial tile-based rendering system for Skia.
 *
 * Divides the world into geographic grid tiles at a fixed zoom level.
 * Each tile is rendered to a cached SkPicture (recorded draw commands).
 * On camera change, only newly-visible tiles need re-recording; cached tiles
 * are replayed via drawPicture — no per-stroke path rebuild.
 *
 * NOTE: We cache SkPicture (not SkImage) because Skia.Surface.MakeOffscreen
 * is unreliable in React Native Skia (often returns null without GPU context).
 * SkPicture replay is still very fast (GPU-cached command buffer).
 */

import {
  Skia,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  BlendMode,
  type SkPaint,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';
import type { StrokeData } from './types';
import { MercatorProjection, BASE_ZOOM } from './MercatorProjection';
import {
  buildBezierPath,
  buildLinearPath,
  generateSprayParticles,
  buildSprayPaths,
  hashString,
} from './brushUtils';
import {
  BRUSH_IDS,
  STROKE_HIDE_ZOOM_DIFF,
} from '@niubi/shared';

// ========================
// Constants
// ========================

/** World-pixel size of each tile at BASE_ZOOM (14) — used for spatial indexing */
const TILE_WORLD_SIZE = 512;

/** Spray degrade threshold: above this many visible spray strokes, simplify */
const SPRAY_DEGRADE_THRESHOLD = 8;

/** Spray disable threshold: above this, render spray as simple lines */
const SPRAY_DISABLE_THRESHOLD = 20;

// ========================
// Brush Config (shared with index.tsx — kept in sync)
// ========================

interface BrushRenderConfig {
  buildPath: (points: { x: number; y: number }[]) => SkPath;
  strokeWidth: (baseSize: number) => number;
  opacity: number;
  blendMode: keyof typeof BlendMode;
  strokeCap: 'butt' | 'round' | 'square';
  strokeJoin: 'bevel' | 'miter' | 'round';
  useLayer?: boolean;
  layerOpacity?: number;
  isSpray?: boolean;
}

function getBrushConfig(brushId: string): BrushRenderConfig {
  switch (brushId) {
    case BRUSH_IDS.PENCIL:
      return {
        buildPath: buildBezierPath,
        strokeWidth: (s) => s,
        opacity: 1.0,
        blendMode: 'SrcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
      };
    case BRUSH_IDS.MARKER:
      return {
        buildPath: buildLinearPath,
        strokeWidth: (s) => s * 3,
        opacity: 1.0,
        blendMode: 'SrcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
        useLayer: true,
        layerOpacity: 0.3,
      };
    case BRUSH_IDS.HIGHLIGHTER:
      return {
        buildPath: buildLinearPath,
        strokeWidth: (s) => s * 2.5,
        opacity: 0.4,
        blendMode: 'Multiply',
        strokeCap: 'butt',
        strokeJoin: 'bevel',
      };
    case BRUSH_IDS.ERASER:
      return {
        buildPath: buildLinearPath,
        strokeWidth: (s) => s * 5,
        opacity: 1.0,
        blendMode: 'Clear',
        strokeCap: 'round',
        strokeJoin: 'round',
      };
    case BRUSH_IDS.SPRAY:
      return {
        buildPath: buildLinearPath,
        strokeWidth: (s) => s,
        opacity: 0.5,
        blendMode: 'SrcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
        isSpray: true,
      };
    default:
      return {
        buildPath: buildBezierPath,
        strokeWidth: (s) => s,
        opacity: 1.0,
        blendMode: 'SrcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
      };
  }
}

// ========================
// Paint Pool
// ========================

const _capMap = { butt: StrokeCap.Butt, round: StrokeCap.Round, square: StrokeCap.Square } as const;
const _joinMap = { bevel: StrokeJoin.Bevel, miter: StrokeJoin.Miter, round: StrokeJoin.Round } as const;

function makePaint(
  color: string,
  alpha: number,
  strokeWidth: number,
  cap: 'butt' | 'round' | 'square',
  join: 'bevel' | 'miter' | 'round',
  blendMode: keyof typeof BlendMode,
  style: 'stroke' | 'fill' = 'stroke'
): SkPaint {
  const p = Skia.Paint();
  p.setColor(Skia.Color(color));
  p.setAlphaf(alpha);
  p.setStrokeWidth(strokeWidth);
  p.setStrokeCap(_capMap[cap]);
  p.setStrokeJoin(_joinMap[join]);
  p.setBlendMode(BlendMode[blendMode] ?? BlendMode.SrcOver);
  p.setStyle(style === 'fill' ? PaintStyle.Fill : PaintStyle.Stroke);
  return p;
}

// ========================
// Tile Key Helpers
// ========================

export interface TileKey {
  tx: number;
  ty: number;
}

function tileKeyStr(tx: number, ty: number): string {
  return `${tx}:${ty}`;
}

/** Convert geo coordinate to tile indices at BASE_ZOOM */
function geoToTile(lng: number, lat: number): TileKey {
  const TILE_SIZE = 512;
  const BASE_WORLD = TILE_SIZE * Math.pow(2, BASE_ZOOM);
  const wx = ((lng + 180) / 360) * BASE_WORLD;
  const latRad = (lat * Math.PI) / 180;
  const wy =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    BASE_WORLD;
  return {
    tx: Math.floor(wx / TILE_WORLD_SIZE),
    ty: Math.floor(wy / TILE_WORLD_SIZE),
  };
}

/** Get world-pixel origin of a tile (top-left corner) */
function tileOrigin(tx: number, ty: number): { wx: number; wy: number } {
  return {
    wx: tx * TILE_WORLD_SIZE,
    wy: ty * TILE_WORLD_SIZE,
  };
}

// ========================
// Per-stroke pre-computed data (cached to avoid re-computation)
// ========================

interface StrokeRenderData {
  id: string;
  data: StrokeData;
  /** World-pixel path relative to anchor */
  path: SkPath;
  /** Anchor in world pixels */
  anchorWx: number;
  anchorWy: number;
  /** Stroke width in world pixels at BASE_ZOOM */
  baseSize: number;
  config: BrushRenderConfig;
  /** Spray particle paths (if spray brush) */
  sprayPaths?: { path: SkPath; alpha: number }[];
  /** Set of tile keys this stroke touches */
  tileKeys: Set<string>;
}

// ========================
// TileRenderer Class
// ========================

export class TileRenderer {
  // Per-stroke render data cache
  private strokeCache = new Map<string, StrokeRenderData>();

  // Spatial index: tile key → set of stroke IDs in that tile
  private tileStrokeIndex = new Map<string, Set<string>>();

  // For geo→world conversion
  private static proj = new MercatorProjection();

  // ----------------
  // Public API
  // ----------------

  /**
   * Update the set of strokes the renderer knows about.
   * Incrementally computes render data for new strokes and marks affected tiles dirty.
   */
  updateStrokes(strokes: StrokeData[]): void {
    const currentIds = new Set<string>();

    for (const s of strokes) {
      currentIds.add(s.id);

      // Skip if already cached
      if (this.strokeCache.has(s.id)) continue;

      // Compute render data for new stroke
      const rd = this.buildStrokeRenderData(s);
      this.strokeCache.set(s.id, rd);

      // Add to spatial index
      for (const tk of rd.tileKeys) {
        if (!this.tileStrokeIndex.has(tk)) {
          this.tileStrokeIndex.set(tk, new Set());
        }
        this.tileStrokeIndex.get(tk)!.add(s.id);
      }
    }

    // Remove deleted strokes
    for (const [id, rd] of this.strokeCache) {
      if (!currentIds.has(id)) {
        for (const tk of rd.tileKeys) {
          this.tileStrokeIndex.get(tk)?.delete(id);
        }
        this.strokeCache.delete(id);
      }
    }
  }

  /** Add a single stroke (used when finishing a new stroke) */
  addStroke(s: StrokeData): void {
    if (this.strokeCache.has(s.id)) return;
    const rd = this.buildStrokeRenderData(s);
    this.strokeCache.set(s.id, rd);
    for (const tk of rd.tileKeys) {
      if (!this.tileStrokeIndex.has(tk)) {
        this.tileStrokeIndex.set(tk, new Set());
      }
      this.tileStrokeIndex.get(tk)!.add(s.id);
    }
  }

  /** Remove a stroke by ID (undo) */
  removeStroke(id: string): void {
    const rd = this.strokeCache.get(id);
    if (!rd) return;
    for (const tk of rd.tileKeys) {
      this.tileStrokeIndex.get(tk)?.delete(id);
    }
    this.strokeCache.delete(id);
  }

  /**
   * Render a complete SkPicture of all visible strokes for the current camera.
   *
   * Uses cached SkPath per stroke — no per-frame path rebuilds.
   * Draws strokes directly (no tile compositing) to avoid boundary clipping.
   *
   * Returns null if there's nothing to render.
   */
  renderFrame(
    center: [number, number],
    zoom: number,
    screenW: number,
    screenH: number,
    bearing: number = 0
  ): SkPicture | null {
    // Update projection for current camera
    TileRenderer.proj.update(center, zoom, screenW, screenH, bearing);

    // Collect visible strokes from visible tiles
    const visibleTiles = this.getVisibleTiles(center, zoom, screenW, screenH);
    if (visibleTiles.length === 0) return null;

    // De-duplicate strokes across tiles
    const visibleStrokeIds = new Set<string>();
    for (const { tx, ty } of visibleTiles) {
      const key = tileKeyStr(tx, ty);
      const ids = this.tileStrokeIndex.get(key);
      if (ids) {
        for (const id of ids) visibleStrokeIds.add(id);
      }
    }

    // Collect and sort render data
    const strokes: StrokeRenderData[] = [];
    for (const id of visibleStrokeIds) {
      const rd = this.strokeCache.get(id);
      if (!rd) continue;
      // Zoom-level visibility filter
      if (zoom < rd.data.createdZoom - STROKE_HIDE_ZOOM_DIFF) continue;
      strokes.push(rd);
    }
    if (strokes.length === 0) return null;

    strokes.sort((a, b) => a.data.createdAt - b.data.createdAt);

    // Render all visible strokes into a single picture
    const scale = Math.pow(2, zoom - BASE_ZOOM);
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(
      Skia.XYWHRect(0, 0, screenW, screenH)
    );

    const sprayCount = strokes.filter((s) => s.config.isSpray).length;

    for (const rs of strokes) {
      // Convert stroke anchor to screen position
      const screenPos = TileRenderer.proj.geoToScreen(
        rs.data.points[0].x,
        rs.data.points[0].y
      );

      canvas.save();
      canvas.translate(screenPos.x, screenPos.y);
      canvas.scale(scale, scale);

      const paint = makePaint(
        rs.data.color,
        rs.data.opacity * rs.config.opacity,
        rs.baseSize,
        rs.config.strokeCap,
        rs.config.strokeJoin,
        rs.config.blendMode
      );

      if (rs.config.isSpray && rs.sprayPaths) {
        if (sprayCount > SPRAY_DISABLE_THRESHOLD) {
          paint.setStyle(PaintStyle.Stroke);
          paint.setAlphaf(rs.data.opacity * 0.3);
          canvas.drawPath(rs.path, paint);
        } else if (sprayCount > SPRAY_DEGRADE_THRESHOLD) {
          paint.setStyle(PaintStyle.Fill);
          const subset = rs.sprayPaths.slice(0, 2);
          for (const sp of subset) {
            const spPaint = paint.copy();
            spPaint.setAlphaf(rs.data.opacity * sp.alpha);
            canvas.drawPath(sp.path, spPaint);
          }
        } else {
          paint.setStyle(PaintStyle.Fill);
          for (const sp of rs.sprayPaths) {
            const spPaint = paint.copy();
            spPaint.setAlphaf(rs.data.opacity * sp.alpha);
            canvas.drawPath(sp.path, spPaint);
          }
        }
      } else {
        paint.setStyle(PaintStyle.Stroke);
        if (rs.config.useLayer) {
          const layerPaint = Skia.Paint();
          layerPaint.setAlphaf(rs.config.layerOpacity ?? 0.3);
          canvas.saveLayer(layerPaint);
          paint.setAlphaf(1.0);
          canvas.drawPath(rs.path, paint);
          canvas.restore();
        } else {
          canvas.drawPath(rs.path, paint);
        }
      }

      canvas.restore();
    }

    return recorder.finishRecordingAsPicture();
  }

  /** Clear all caches (call on cleanup or memory pressure) */
  clear(): void {
    this.strokeCache.clear();
    this.tileStrokeIndex.clear();
  }

  get cacheStats() {
    return {
      strokes: this.strokeCache.size,
      tileIndex: this.tileStrokeIndex.size,
    };
  }

  // ----------------
  // Internal
  // ----------------

  private buildStrokeRenderData(s: StrokeData): StrokeRenderData {
    const config = getBrushConfig(s.brushId);
    const baseScale = Math.pow(2, BASE_ZOOM - s.createdZoom);
    const baseSize = config.strokeWidth(s.size) * baseScale;

    // Anchor = first point in world pixels
    const TILE_SIZE = 512;
    const BASE_WORLD = TILE_SIZE * Math.pow(2, BASE_ZOOM);
    const anchor = s.points[0];

    const anchorWx = ((anchor.x + 180) / 360) * BASE_WORLD;
    const latRad = (anchor.y * Math.PI) / 180;
    const anchorWy =
      ((1 -
        Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
        2) *
      BASE_WORLD;

    // Convert all points to world pixels relative to anchor
    const relPoints = s.points.map((p) => {
      const wx = ((p.x + 180) / 360) * BASE_WORLD;
      const lr = (p.y * Math.PI) / 180;
      const wy =
        ((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2) *
        BASE_WORLD;
      return {
        x: wx - anchorWx,
        y: wy - anchorWy,
        pressure: p.pressure,
      };
    });

    const path = config.buildPath(relPoints);

    // Determine which tiles this stroke touches
    const tileKeys = new Set<string>();
    // Check anchor tile + all tiles that any point falls into
    for (const p of s.points) {
      const tk = geoToTile(p.x, p.y);
      tileKeys.add(tileKeyStr(tk.tx, tk.ty));
    }
    // Also add bounding box corners for wide strokes
    const margin = baseSize * 2; // world pixels margin
    const corners = [
      { wx: anchorWx + relPoints[0].x - margin, wy: anchorWy + relPoints[0].y - margin },
      { wx: anchorWx + relPoints[0].x + margin, wy: anchorWy + relPoints[0].y + margin },
    ];
    // Just add anchor tile neighbors if stroke is wide
    if (margin > TILE_WORLD_SIZE * 0.1) {
      const tk = geoToTile(anchor.x, anchor.y);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          tileKeys.add(tileKeyStr(tk.tx + dx, tk.ty + dy));
        }
      }
    }

    const rd: StrokeRenderData = {
      id: s.id,
      data: s,
      path,
      anchorWx,
      anchorWy,
      baseSize,
      config,
      tileKeys,
    };

    // Generate spray paths
    if (config.isSpray) {
      const radius = s.size * baseScale * 0.75;
      const particles = generateSprayParticles(relPoints, radius, hashString(s.id));
      rd.sprayPaths = buildSprayPaths(particles);
    }

    return rd;
  }

  private getVisibleTiles(
    center: [number, number],
    zoom: number,
    screenW: number,
    screenH: number
  ): TileKey[] {
    const scale = Math.pow(2, zoom - BASE_ZOOM);
    const tileScreenSize = TILE_WORLD_SIZE * scale;

    if (tileScreenSize < 1) return []; // Zoom too far out

    // Center in world pixels
    const TILE_SIZE = 512;
    const BASE_WORLD = TILE_SIZE * Math.pow(2, BASE_ZOOM);
    const centerWx = ((center[0] + 180) / 360) * BASE_WORLD;
    const latRad = (center[1] * Math.PI) / 180;
    const centerWy =
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      BASE_WORLD;

    // How many world pixels the screen covers
    const halfScreenWx = (screenW / 2) / scale;
    const halfScreenWy = (screenH / 2) / scale;

    // Add 1-tile margin
    const minTx = Math.floor((centerWx - halfScreenWx) / TILE_WORLD_SIZE) - 1;
    const maxTx = Math.floor((centerWx + halfScreenWx) / TILE_WORLD_SIZE) + 1;
    const minTy = Math.floor((centerWy - halfScreenWy) / TILE_WORLD_SIZE) - 1;
    const maxTy = Math.floor((centerWy + halfScreenWy) / TILE_WORLD_SIZE) + 1;

    const tiles: TileKey[] = [];
    for (let tx = minTx; tx <= maxTx; tx++) {
      for (let ty = minTy; ty <= maxTy; ty++) {
        // Only include tiles that have strokes
        const key = tileKeyStr(tx, ty);
        if (this.tileStrokeIndex.has(key) && this.tileStrokeIndex.get(key)!.size > 0) {
          tiles.push({ tx, ty });
        }
      }
    }

    return tiles;
  }
}
