import { BaseBrush } from './BaseBrush';
import type { StrokePoint, StrokeData, BrushConfig } from '../types';

/**
 * Pencil brush — thin lines with Bézier smoothing and pressure-variable width.
 */
export class PencilBrush extends BaseBrush {
  readonly id = 'pencil';
  readonly name = '铅笔';
  readonly icon = 'Pencil';
  readonly minSize = 0.5;
  readonly maxSize = 8;
  readonly supportsPressure = true;

  onStrokeStart(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    config: BrushConfig
  ): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = config.color;
    ctx.globalAlpha = config.opacity;
    ctx.lineWidth = this.getWidth(config.size, point.pressure);
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

    ctx.lineWidth = this.getWidth(config.size, last.pressure);

    // Use quadratic Bézier for smoother curves
    if (points.length >= 3) {
      const prevPrev = points[points.length - 3];
      const midX1 = (prevPrev.x + prev.x) / 2;
      const midY1 = (prevPrev.y + prev.y) / 2;
      const midX2 = (prev.x + last.x) / 2;
      const midY2 = (prev.y + last.y) / 2;

      ctx.beginPath();
      ctx.moveTo(midX1, midY1);
      ctx.quadraticCurveTo(prev.x, prev.y, midX2, midY2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }
  }

  onStrokeEnd(ctx: CanvasRenderingContext2D, _config: BrushConfig): void {
    ctx.restore();
  }

  renderFullStroke(ctx: CanvasRenderingContext2D, stroke: StrokeData): void {
    const { points } = stroke;
    if (points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity;

    if (points.length === 1) {
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Draw using quadratic Bézier through midpoints
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      ctx.lineWidth = this.getWidth(stroke.size, curr.pressure);

      if (i >= 2) {
        const prevPrev = points[i - 2];
        const midX1 = (prevPrev.x + prev.x) / 2;
        const midY1 = (prevPrev.y + prev.y) / 2;
        const midX2 = (prev.x + curr.x) / 2;
        const midY2 = (prev.y + curr.y) / 2;

        ctx.beginPath();
        ctx.moveTo(midX1, midY1);
        ctx.quadraticCurveTo(prev.x, prev.y, midX2, midY2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
