import { BaseBrush } from './BaseBrush';
import type { StrokePoint, StrokeData, BrushConfig } from '../types';

/**
 * Highlighter brush — uses 'multiply' composite operation for translucent highlight effect.
 * Fixed opacity at 0.4. Color blends with content underneath.
 */
export class HighlighterBrush extends BaseBrush {
  readonly id = 'highlighter';
  readonly name = '荧光笔';
  readonly icon = 'Highlighter';
  readonly minSize = 3;
  readonly maxSize = 20;
  readonly supportsPressure = false;

  private static readonly FIXED_OPACITY = 0.4;

  onStrokeStart(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    config: BrushConfig
  ): void {
    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = config.color;
    ctx.globalAlpha = HighlighterBrush.FIXED_OPACITY;
    ctx.lineWidth = config.size * 2.5;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  onStrokeMove(
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    _config: BrushConfig
  ): void {
    if (points.length < 2) return;
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    // Restart path to avoid re-stroking the entire path each move
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
  }

  onStrokeEnd(ctx: CanvasRenderingContext2D, _config: BrushConfig): void {
    ctx.stroke();
    ctx.restore();
  }

  renderFullStroke(ctx: CanvasRenderingContext2D, stroke: StrokeData): void {
    const { points } = stroke;
    if (points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = HighlighterBrush.FIXED_OPACITY;
    ctx.lineWidth = stroke.size * 2.5;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
