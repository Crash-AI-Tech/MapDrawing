import type { StrokePoint, StrokeData, BrushConfig } from '../types';

/**
 * Abstract base class for all brushes.
 * Implement this to create a new brush type.
 * The brush system is framework-agnostic (pure Canvas2D).
 */
export abstract class BaseBrush {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly icon: string;

  /** Min/max size constraints */
  abstract readonly minSize: number;
  abstract readonly maxSize: number;
  /** Whether this brush supports pressure sensitivity */
  abstract readonly supportsPressure: boolean;

  /**
   * Called when a new stroke begins (pointerdown)
   */
  abstract onStrokeStart(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    config: BrushConfig
  ): void;

  /**
   * Called for each new point during drawing (pointermove)
   * @param points - All points collected so far (including the new one)
   */
  abstract onStrokeMove(
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    config: BrushConfig
  ): void;

  /**
   * Called when the stroke ends (pointerup)
   */
  abstract onStrokeEnd(
    ctx: CanvasRenderingContext2D,
    config: BrushConfig
  ): void;

  /**
   * Render a complete stroke (used for history replay / tile cache)
   */
  abstract renderFullStroke(
    ctx: CanvasRenderingContext2D,
    stroke: StrokeData
  ): void;

  /**
   * Calculate the effective width at a given point
   */
  protected getWidth(baseSize: number, pressure: number): number {
    return baseSize * (0.5 + pressure * 0.5);
  }
}
