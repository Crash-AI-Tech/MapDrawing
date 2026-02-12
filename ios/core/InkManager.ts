/**
 * InkManager — area-based ink cost system.
 * Port of web/src/core/engine/InkManager.ts.
 *
 * Ink formula: cost = brushSize × pixelDistance × 2^(2 × (18 - zoom)) / K
 * - Higher zoom = cheaper (encourages fine drawing)
 * - Lower zoom = expensive (discourages large-area coverage)
 */

const MAX_INK = 100;
const REGEN_INTERVAL_MS = 18_000; // 18 seconds
const REGEN_AMOUNT = 1;
const INK_COST_K = 20;
const ZOOM_BASE = 18;

export class InkManager {
  private ink = MAX_INK;
  private regenTimer: ReturnType<typeof setInterval> | null = null;
  private onChange: ((ink: number) => void) | null = null;

  constructor(onChange?: (ink: number) => void) {
    this.onChange = onChange ?? null;
    this.startRegen();
  }

  get current(): number {
    return this.ink;
  }

  get max(): number {
    return MAX_INK;
  }

  /** Check if user has any ink remaining */
  canDraw(): boolean {
    return this.ink > 0;
  }

  /**
   * Calculate the ink cost for a single stroke segment.
   *
   * @param brushSize - Current brush base size
   * @param pixelDistance - Screen pixel distance of the segment
   * @param zoom - Current map zoom level
   * @returns Fractional ink cost
   */
  calculateSegmentCost(
    brushSize: number,
    pixelDistance: number,
    zoom: number
  ): number {
    const zoomFactor = Math.pow(2, 2 * (ZOOM_BASE - zoom));
    return (brushSize * pixelDistance * zoomFactor) / INK_COST_K;
  }

  /**
   * Force-consume ink (fractional amounts supported).
   * Used by DrawingEngine's ink accumulator.
   *
   * @returns Remaining ink
   */
  forceConsume(amount: number): number {
    this.ink = Math.max(0, this.ink - amount);
    this.onChange?.(this.ink);
    return this.ink;
  }

  /**
   * Try to consume a fixed amount of ink.
   * Used for pin placement (PIN_INK_COST = 50).
   *
   * @returns true if consumed, false if insufficient
   */
  consume(amount: number): boolean {
    if (this.ink < amount) return false;
    this.ink -= amount;
    this.onChange?.(this.ink);
    return true;
  }

  /** Clean up timer */
  dispose(): void {
    if (this.regenTimer) {
      clearInterval(this.regenTimer);
      this.regenTimer = null;
    }
  }

  // ===== Internal =====

  private startRegen(): void {
    this.regenTimer = setInterval(() => {
      if (this.ink < MAX_INK) {
        this.ink = Math.min(MAX_INK, this.ink + REGEN_AMOUNT);
        this.onChange?.(this.ink);
      }
    }, REGEN_INTERVAL_MS);
  }
}
