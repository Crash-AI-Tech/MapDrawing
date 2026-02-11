import { BaseBrush } from './BaseBrush';
import type { StrokePoint, StrokeData, BrushConfig } from '../types';

/**
 * Marker brush — wide strokes with semi-transparency.
 * Uses a two-pass technique to avoid color accumulation within the same stroke.
 */
export class MarkerBrush extends BaseBrush {
  readonly id = 'marker';
  readonly name = '马克笔';
  readonly icon = 'Pen';
  readonly minSize = 2;
  readonly maxSize = 20;
  readonly supportsPressure = false;

  private offscreenCanvas: OffscreenCanvas | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  onStrokeStart(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    config: BrushConfig
  ): void {
    // Create offscreen buffer to draw at full opacity, then composite with alpha
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    this.offscreenCanvas = new OffscreenCanvas(w, h);
    this.offscreenCtx = this.offscreenCanvas.getContext('2d') as unknown as CanvasRenderingContext2D;

    this.offscreenCtx.lineCap = 'round';
    this.offscreenCtx.lineJoin = 'round';
    this.offscreenCtx.strokeStyle = config.color;
    this.offscreenCtx.lineWidth = config.size * 3;
    this.offscreenCtx.globalAlpha = 1;

    this.offscreenCtx.beginPath();
    this.offscreenCtx.moveTo(point.x, point.y);
  }

  onStrokeMove(
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    config: BrushConfig
  ): void {
    if (!this.offscreenCtx || !this.offscreenCanvas || points.length < 2) return;

    const last = points[points.length - 1];
    const prev = points[points.length - 2];

    // Draw on offscreen at full opacity
    this.offscreenCtx.beginPath();
    this.offscreenCtx.moveTo(prev.x, prev.y);
    this.offscreenCtx.lineTo(last.x, last.y);
    this.offscreenCtx.stroke();

    // Composite to main canvas with reduced alpha
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 0.3 * config.opacity;
    ctx.drawImage(this.offscreenCanvas as unknown as ImageBitmap, 0, 0);
    ctx.restore();
  }

  onStrokeEnd(ctx: CanvasRenderingContext2D, config: BrushConfig): void {
    if (this.offscreenCanvas) {
      ctx.save();
      ctx.globalAlpha = 0.3 * config.opacity;
      ctx.drawImage(this.offscreenCanvas as unknown as ImageBitmap, 0, 0);
      ctx.restore();
    }
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
  }

  renderFullStroke(ctx: CanvasRenderingContext2D, stroke: StrokeData): void {
    const { points } = stroke;
    if (points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size * 3;
    ctx.globalAlpha = 0.3 * stroke.opacity;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
