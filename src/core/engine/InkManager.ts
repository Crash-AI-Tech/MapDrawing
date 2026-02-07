/**
 * InkManager — manages the ink (energy) system for drawing.
 *
 * Area-based ink consumption model:
 * - Max ink: 100
 * - Regen: +1 every 18 seconds
 * - Cost per segment = brushSize × pixelDistance × 2^(2×(ZOOM_BASE - zoom)) / K
 *   → zoom 每低一级，面积 ×4（二次方缩放）
 *   → 精细绘画（高 zoom + 小笔）消耗极低，鼓励精细绘画
 *   → 低 zoom + 大笔 = 快速消耗，防止恶意覆盖
 * - Persists to localStorage with offline recovery
 */

const INK_STORAGE_KEY = 'niubi-ink-state';
const MAX_INK = 100;
const REGEN_AMOUNT = 1;
const REGEN_INTERVAL_MS = 18_000; // 18 seconds

/**
 * ★ 平衡常数 K — 调大 = 整体更便宜，调小 = 整体更贵 ★
 * 当前 K=500，可在此处手动调整，修改后刷新立即生效。
 */
const INK_COST_K = 20;

/** 基准缩放等级（也是最低可绘画缩放等级） */
const ZOOM_BASE = 18;

export type InkChangeListener = (ink: number, maxInk: number) => void;

interface InkSaveData {
  ink: number;
  timestamp: number;
}

export class InkManager {
  private ink: number;
  readonly maxInk = MAX_INK;
  private regenTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<InkChangeListener>();

  constructor() {
    this.ink = this.loadFromStorage();
    this.startRegen();
  }

  // ========================
  // Public API
  // ========================

  /** Get current ink level */
  getInk(): number {
    return this.ink;
  }

  /**
   * Calculate ink cost for a line segment based on covered AREA.
   * Formula: cost = brushSize × pixelDistance × 2^(2×(ZOOM_BASE - zoom)) / K
   *
   * The 2× exponent means each zoom level down → 4× cost (area scales quadratically).
   *
   * Examples (K=500, 400px stroke):
   *   zoom 18, size 3  → 3×400×1/500   = 2.4 ink   → ~42 strokes per 100 ink
   *   zoom 18, size 10 → 10×400×1/500  = 8.0 ink   → ~12 strokes per 100 ink
   *   zoom 19, size 3  → 3×400×0.25/500 = 0.6 ink  → ~167 strokes per 100 ink
   *   zoom 20, size 1  → 1×400×0.0625/500 = 0.05   → ~2000 strokes per 100 ink
   *
   * @param brushSize - current brush size (1~10)
   * @param pixelDistance - screen-space distance of this segment in pixels
   * @param currentZoom - current map zoom level
   * @returns fractional ink cost for this segment
   */
  calculateSegmentCost(brushSize: number, pixelDistance: number, currentZoom: number = ZOOM_BASE): number {
    const areaZoomMultiplier = Math.pow(2, 2 * (ZOOM_BASE - currentZoom));
    return (brushSize * pixelDistance * areaZoomMultiplier) / INK_COST_K;
  }

  /**
   * Try to consume ink. Returns true if there was enough ink.
   * @param amount - ink to consume
   */
  consume(amount: number): boolean {
    if (this.ink < amount) {
      return false;
    }
    this.ink = Math.max(0, this.ink - amount);
    this.save();
    this.notifyListeners();
    return true;
  }

  /**
   * Check whether there is enough ink to start drawing at all.
   * Any positive ink amount allows drawing (float-friendly).
   */
  canDraw(): boolean {
    return this.ink > 0;
  }

  /**
   * Force-consume ink (for partial stroke during drawing).
   * Reduces ink but does not reject. Returns remaining ink.
   */
  forceConsume(amount: number): number {
    this.ink = Math.max(0, this.ink - amount);
    this.save();
    this.notifyListeners();
    return this.ink;
  }

  /** Subscribe to ink changes */
  subscribe(listener: InkChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Clean up timers */
  dispose(): void {
    if (this.regenTimer !== null) {
      clearInterval(this.regenTimer);
      this.regenTimer = null;
    }
    this.save();
    this.listeners.clear();
  }

  // ========================
  // Internals
  // ========================

  private startRegen(): void {
    this.regenTimer = setInterval(() => {
      if (this.ink < MAX_INK) {
        this.ink = Math.min(MAX_INK, this.ink + REGEN_AMOUNT);
        this.save();
        this.notifyListeners();
      }
    }, REGEN_INTERVAL_MS);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.ink, this.maxInk);
    }
  }

  private save(): void {
    try {
      const data: InkSaveData = {
        ink: this.ink,
        timestamp: Date.now(),
      };
      localStorage.setItem(INK_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage might not be available
    }
  }

  private loadFromStorage(): number {
    try {
      const raw = localStorage.getItem(INK_STORAGE_KEY);
      if (!raw) return MAX_INK;

      const data: InkSaveData = JSON.parse(raw);
      if (typeof data.ink !== 'number' || typeof data.timestamp !== 'number') {
        return MAX_INK;
      }

      // Calculate offline regen: how many regen ticks passed since last save
      const elapsed = Date.now() - data.timestamp;
      const regenTicks = Math.floor(elapsed / REGEN_INTERVAL_MS);
      const recovered = Math.min(MAX_INK, data.ink + regenTicks * REGEN_AMOUNT);

      return recovered;
    } catch {
      return MAX_INK;
    }
  }
}
