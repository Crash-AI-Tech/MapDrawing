import { StrokeManager } from './StrokeManager';
import { HistoryManager, type Command } from './HistoryManager';
import { ViewportManager } from './ViewportManager';
import { InkManager } from './InkManager';
import { createDefaultBrushRegistry, type BrushRegistry, type BaseBrush } from '../brushes';
import type {
  StrokeData,
  StrokePoint,
  BrushConfig,
  GeoBounds,
  DrawEvent,
} from '../types';
import { v7 as uuidv7 } from 'uuid';

// ========================
// Event Types
// ========================

export type EngineEvent =
  | { type: 'stroke:start'; strokeId: string }
  | { type: 'stroke:move'; strokeId: string; pointCount: number }
  | { type: 'stroke:end'; stroke: StrokeData }
  | { type: 'stroke:added'; stroke: StrokeData }
  | { type: 'stroke:deleted'; strokeId: string }
  | { type: 'history:change'; canUndo: boolean; canRedo: boolean }
  | { type: 'viewport:change' }
  | { type: 'render:request' }
  | { type: 'ink:empty' }
  | { type: 'ink:low' };

export type EngineEventListener = (event: EngineEvent) => void;

export interface DrawingEngineConfig {
  userId: string;
  userName: string;
}

/**
 * DrawingEngine — core entry point for the drawing system.
 * Pure TypeScript, zero React/Next.js dependencies.
 * Bridges: BrushRegistry + StrokeManager + HistoryManager + ViewportManager
 */
export class DrawingEngine {
  readonly strokes: StrokeManager;
  readonly history: HistoryManager;
  readonly viewport: ViewportManager;
  readonly brushes: BrushRegistry;
  readonly inkManager: InkManager;

  private userId: string;
  private userName: string;
  private activeBrushId: string = 'pencil';
  private activeColor: string = '#000000';
  private activeOpacity: number = 1.0;
  private activeSize: number = 3;

  /** Currently drawing stroke state */
  private currentStroke: {
    id: string;
    points: StrokePoint[];
    brush: BaseBrush;
    /** Number of points already consumed ink for */
    consumedPointCount: number;
  } | null = null;

  /** Active canvas context for live drawing */
  private activeCtx: CanvasRenderingContext2D | null = null;

  private listeners = new Set<EngineEventListener>();
  private disposed = false;

  constructor(config: DrawingEngineConfig) {
    this.userId = config.userId;
    this.userName = config.userName;

    this.strokes = new StrokeManager();
    this.history = new HistoryManager(100);
    this.viewport = new ViewportManager();
    this.brushes = createDefaultBrushRegistry();
    this.inkManager = new InkManager();

    // Wire up history → events
    this.history.subscribe((canUndo, canRedo) => {
      this.emit({ type: 'history:change', canUndo, canRedo });
    });

    // Wire up viewport → events
    this.viewport.subscribe(() => {
      this.emit({ type: 'viewport:change' });
    });
  }

  // ========================
  // Configuration
  // ========================

  setActiveCanvas(ctx: CanvasRenderingContext2D): void {
    this.activeCtx = ctx;
  }

  setBrush(brushId: string): void {
    this.activeBrushId = brushId;
  }

  setColor(color: string): void {
    this.activeColor = color;
  }

  setOpacity(opacity: number): void {
    this.activeOpacity = Math.max(0, Math.min(1, opacity));
  }

  setSize(size: number): void {
    this.activeSize = Math.max(0.1, size);
  }

  getBrushId(): string { return this.activeBrushId; }
  getColor(): string { return this.activeColor; }
  getOpacity(): number { return this.activeOpacity; }
  getSize(): number { return this.activeSize; }

  // ========================
  // Drawing Lifecycle
  // ========================

  /** Start a new stroke */
  startStroke(screenX: number, screenY: number, pressure: number = 0.5): void {
    if (this.disposed || !this.activeCtx) return;

    // Check ink before starting
    if (!this.inkManager.canDraw()) {
      this.emit({ type: 'ink:empty' });
      return;
    }

    const brush = this.brushes.get(this.activeBrushId);
    if (!brush) return;

    const geo = this.viewport.screenToGeo(screenX, screenY);
    if (!geo) return;

    const point: StrokePoint = {
      x: screenX,
      y: screenY,
      pressure: brush.supportsPressure ? pressure : 0.5,
      timestamp: Date.now(),
    };

    const id = uuidv7();
    this.currentStroke = {
      id,
      points: [point],
      brush,
      consumedPointCount: 0,
    };

    const config = this.buildBrushConfig(pressure);
    brush.onStrokeStart(this.activeCtx, point, config);
    this.emit({ type: 'stroke:start', strokeId: id });
  }

  /** Continue the current stroke with a new point */
  moveStroke(screenX: number, screenY: number, pressure: number = 0.5): void {
    if (!this.currentStroke || !this.activeCtx) return;

    const point: StrokePoint = {
      x: screenX,
      y: screenY,
      pressure: this.currentStroke.brush.supportsPressure ? pressure : 0.5,
      timestamp: Date.now(),
    };

    this.currentStroke.points.push(point);

    // Real-time ink consumption: calculate cost for new points since last consume
    const newPoints = this.currentStroke.points.length - this.currentStroke.consumedPointCount;
    // Consume every 5 new points (batch to avoid excessive calls)
    if (newPoints >= 5) {
      const cost = this.inkManager.calculateCost(newPoints, this.activeSize);
      const remaining = this.inkManager.forceConsume(cost);
      this.currentStroke.consumedPointCount = this.currentStroke.points.length;

      // If ink fully depleted, auto-end the stroke
      if (remaining <= 0) {
        this.emit({ type: 'ink:empty' });
        this.endStroke();
        return;
      }

      // Warn when low
      if (remaining <= 15) {
        this.emit({ type: 'ink:low' });
      }
    }

    const config = this.buildBrushConfig(pressure);
    this.currentStroke.brush.onStrokeMove(
      this.activeCtx,
      this.currentStroke.points,
      config
    );

    this.emit({
      type: 'stroke:move',
      strokeId: this.currentStroke.id,
      pointCount: this.currentStroke.points.length,
    });
  }

  /** End the current stroke */
  endStroke(): StrokeData | null {
    if (!this.currentStroke || !this.activeCtx) return null;

    // Consume ink for any remaining un-consumed points
    if (this.currentStroke) {
      const remainingPoints = this.currentStroke.points.length - this.currentStroke.consumedPointCount;
      if (remainingPoints > 0) {
        const cost = this.inkManager.calculateCost(remainingPoints, this.activeSize);
        this.inkManager.forceConsume(cost);
      }
    }

    const { id, points, brush } = this.currentStroke;

    // Ignore strokes with too few points
    if (points.length < 2) {
      this.currentStroke = null;
      this.clearActiveCanvas();
      return null;
    }

    const config = this.buildBrushConfig(0.5);
    brush.onStrokeEnd(this.activeCtx, config);

    // Calculate bounds from points
    const bounds = this.calculateBounds(points);

    // Convert screen points to geo points for storage
    const geoPoints = this.convertPointsToGeo(points);

    const stroke: StrokeData = {
      id,
      userId: this.userId,
      userName: this.userName,
      brushId: this.activeBrushId,
      color: this.activeColor,
      opacity: this.activeOpacity,
      size: this.activeSize,
      points: geoPoints,
      bounds,
      createdZoom: this.viewport.zoom,
      createdAt: Date.now(),
    };

    // Add to stroke manager
    this.strokes.add(stroke);

    // Push history command
    this.history.push({ type: 'ADD_STROKE', stroke });

    this.currentStroke = null;

    // Clear active canvas and request re-render
    this.clearActiveCanvas();
    this.emit({ type: 'stroke:end', stroke });
    this.emit({ type: 'render:request' });

    return stroke;
  }

  /** Cancel the current stroke without saving */
  cancelStroke(): void {
    if (!this.currentStroke || !this.activeCtx) return;
    this.currentStroke = null;
    this.clearActiveCanvas();
  }

  // ========================
  // External Stroke Operations (from sync/loading)
  // ========================

  /** Add a stroke from external source (sync, DB load) */
  addExternalStroke(stroke: StrokeData): void {
    this.strokes.add(stroke);
    this.emit({ type: 'stroke:added', stroke });
    this.emit({ type: 'render:request' });
  }

  /** Add multiple strokes (bulk loading from DB) */
  loadStrokes(strokes: StrokeData[]): void {
    this.strokes.bulkLoad(strokes);
    this.emit({ type: 'render:request' });
  }

  /** Delete a stroke by ID */
  deleteStroke(strokeId: string): StrokeData | null {
    const stroke = this.strokes.remove(strokeId);
    if (!stroke) return null;

    this.history.push({ type: 'DELETE_STROKE', stroke });
    this.emit({ type: 'stroke:deleted', strokeId });
    this.emit({ type: 'render:request' });
    return stroke;
  }

  // ========================
  // Undo/Redo
  // ========================

  undo(): DrawEvent | null {
    const cmd = this.history.undo();
    if (!cmd) return null;
    return this.applyInverseCommand(cmd);
  }

  redo(): DrawEvent | null {
    const cmd = this.history.redo();
    if (!cmd) return null;
    return this.applyCommand(cmd);
  }

  // ========================
  // Query
  // ========================

  /** Get all strokes visible in the current viewport */
  getVisibleStrokes(): StrokeData[] {
    const bounds = this.viewport.getBounds();
    return this.strokes.queryByBounds(bounds);
  }

  /** Check if currently drawing */
  get isDrawing(): boolean {
    return this.currentStroke !== null;
  }

  // ========================
  // Events
  // ========================

  subscribe(listener: EngineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EngineEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  // ========================
  // Lifecycle
  // ========================

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.strokes.clear();
    this.history.clear();
    this.inkManager.dispose();
    this.activeCtx = null;
    this.currentStroke = null;
  }

  // ========================
  // Internals
  // ========================

  private buildBrushConfig(pressure: number): BrushConfig {
    return {
      color: this.activeColor,
      opacity: this.activeOpacity,
      // 使用原始 CSS 像素大小进行实时绘制，缩放仅在合成渲染时处理
      size: this.activeSize,
      baseSize: this.activeSize,
      pressure,
    };
  }

  private clearActiveCanvas(): void {
    if (!this.activeCtx) return;
    this.activeCtx.clearRect(
      0,
      0,
      this.activeCtx.canvas.width,
      this.activeCtx.canvas.height
    );
  }

  private calculateBounds(points: StrokePoint[]): GeoBounds {
    const geoPoints = points
      .map((p) => this.viewport.screenToGeo(p.x, p.y))
      .filter((g): g is { lng: number; lat: number } => g !== null);

    if (geoPoints.length === 0) {
      return { minLng: 0, maxLng: 0, minLat: 0, maxLat: 0 };
    }

    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;

    for (const { lng, lat } of geoPoints) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    return { minLng, maxLng, minLat, maxLat };
  }

  private convertPointsToGeo(points: StrokePoint[]): StrokePoint[] {
    return points.map((p) => {
      const geo = this.viewport.screenToGeo(p.x, p.y);
      if (!geo) return p;
      return { ...p, x: geo.lng, y: geo.lat };
    });
  }

  private applyCommand(cmd: Command): DrawEvent | null {
    switch (cmd.type) {
      case 'ADD_STROKE':
        this.strokes.add(cmd.stroke);
        this.emit({ type: 'stroke:added', stroke: cmd.stroke });
        this.emit({ type: 'render:request' });
        return { type: 'STROKE_ADD', stroke: cmd.stroke };
      case 'DELETE_STROKE':
        this.strokes.remove(cmd.stroke.id);
        this.emit({ type: 'stroke:deleted', strokeId: cmd.stroke.id });
        this.emit({ type: 'render:request' });
        return { type: 'STROKE_DELETE', strokeId: cmd.stroke.id, userId: cmd.stroke.userId };
      default:
        return null;
    }
  }

  private applyInverseCommand(cmd: Command): DrawEvent | null {
    switch (cmd.type) {
      case 'ADD_STROKE':
        // Inverse of ADD is DELETE
        this.strokes.remove(cmd.stroke.id);
        this.emit({ type: 'stroke:deleted', strokeId: cmd.stroke.id });
        this.emit({ type: 'render:request' });
        return { type: 'STROKE_DELETE', strokeId: cmd.stroke.id, userId: cmd.stroke.userId };
      case 'DELETE_STROKE':
        // Inverse of DELETE is ADD
        this.strokes.add(cmd.stroke);
        this.emit({ type: 'stroke:added', stroke: cmd.stroke });
        this.emit({ type: 'render:request' });
        return { type: 'STROKE_ADD', stroke: cmd.stroke };
      default:
        return null;
    }
  }
}
