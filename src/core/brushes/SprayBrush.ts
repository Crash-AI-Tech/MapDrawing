import { BaseBrush } from './BaseBrush';
import type { StrokePoint, StrokeData, BrushConfig } from '../types';

/**
 * Spray brush — random particle spray with Gaussian density falloff.
 */
export class SprayBrush extends BaseBrush {
  readonly id = 'spray';
  readonly name = '喷枪';
  readonly icon = 'SprayCan';
  readonly minSize = 5;
  readonly maxSize = 20;
  readonly supportsPressure = true;

  /** Number of particles per spray event */
  private readonly DENSITY = 30;

  onStrokeStart(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    config: BrushConfig
  ): void {
    this.sprayAt(ctx, point.x, point.y, config);
  }

  onStrokeMove(
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    config: BrushConfig
  ): void {
    if (points.length < 1) return;
    const last = points[points.length - 1];
    this.sprayAt(ctx, last.x, last.y, config);
  }

  onStrokeEnd(_ctx: CanvasRenderingContext2D, _config: BrushConfig): void {
    // No cleanup needed
  }

  renderFullStroke(ctx: CanvasRenderingContext2D, stroke: StrokeData): void {
    ctx.save();
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity;

    const config: BrushConfig = {
      color: stroke.color,
      opacity: stroke.opacity,
      size: stroke.size,
      baseSize: stroke.size,
      pressure: 0.5,
    };

    // Seed the random generator deterministically using stroke id
    let seed = this.hashString(stroke.id);
    const random = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (const point of stroke.points) {
      const radius = config.size * (0.5 + point.pressure * 0.5);
      const count = Math.floor(this.DENSITY * point.pressure);
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const r = random() * radius;
        // Gaussian falloff: particles more likely near center
        const gaussR = r * Math.sqrt(-2 * Math.log(Math.max(random(), 0.001)));
        const effectiveR = Math.min(gaussR, radius);
        const px = point.x + Math.cos(angle) * effectiveR;
        const py = point.y + Math.sin(angle) * effectiveR;

        ctx.globalAlpha = stroke.opacity * (1 - effectiveR / radius) * 0.6;
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }

    ctx.restore();
  }

  private sprayAt(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    config: BrushConfig
  ): void {
    ctx.save();
    ctx.fillStyle = config.color;

    const radius = config.size * (0.5 + config.pressure * 0.5);
    const count = Math.floor(this.DENSITY * config.pressure);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;

      const alpha = config.opacity * (1 - r / radius) * 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillRect(px, py, 1.5, 1.5);
    }

    ctx.restore();
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash);
  }
}
