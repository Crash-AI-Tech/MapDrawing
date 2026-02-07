/**
 * InkManager — manages the ink (energy) system for drawing.
 *
 * - Max ink: 100
 * - Regen: +1 every 8 seconds
 * - Cost: ceil(pointCount × brushSize / 50), minimum 1
 * - Persists to localStorage with offline recovery
 */

const INK_STORAGE_KEY = 'niubi-ink-state';
const MAX_INK = 100;
const REGEN_AMOUNT = 1;
const REGEN_INTERVAL_MS = 8_000; // 8 seconds
const COST_DIVISOR = 50;

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
   * Calculate the ink cost for a stroke segment.
   * Called incrementally during drawing.
   * @param newPointCount - number of NEW points added since last call
   * @param brushSize - current brush size
   */
  calculateCost(pointCount: number, brushSize: number): number {
    return Math.max(1, Math.ceil((pointCount * brushSize) / COST_DIVISOR));
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
   * At minimum, 1 ink is needed.
   */
  canDraw(): boolean {
    return this.ink >= 1;
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
