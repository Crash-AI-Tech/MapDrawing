import { BaseBrush } from './BaseBrush';
import type { StrokePoint, StrokeData, BrushConfig } from '../types';

/**
 * EraserBrush — erases drawn content using `destination-out` composite operation.
 * Equivalent to Skia's `BlendMode.Clear` on iOS.
 * Stroke width is multiplied by 5 to match iOS eraser behaviour.
 */
export class EraserBrush extends BaseBrush {
  readonly id = 'eraser';
  readonly name = '橡皮擦';
  readonly icon = 'Eraser';
  readonly minSize = 1;
  readonly maxSize = 10;
  readonly supportsPressure = false;

  /** Size multiplier — matches iOS `strokeWidth: (s) => s * 5` */
  private readonly SIZE_MULT = 5;

  onStrokeStart(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    config: BrushConfig
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = config.size * this.SIZE_MULT;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  onStrokeMove(
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    config: BrushConfig
  ): void {
    if (points.length < 2) return;

    const last = points[points.length - 1];
    const prev = points[points.length - 2];

    ctx.lineWidth = config.size * this.SIZE_MULT;

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  onStrokeEnd(ctx: CanvasRenderingContext2D, _config: BrushConfig): void {
    ctx.restore();
  }

  renderFullStroke(ctx: CanvasRenderingContext2D, stroke: StrokeData): void {
    const { points } = stroke;
    if (points.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.size * this.SIZE_MULT;
    ctx.globalAlpha = 1.0;

    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(
        points[0].x,
        points[0].y,
        (stroke.size * this.SIZE_MULT) / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
