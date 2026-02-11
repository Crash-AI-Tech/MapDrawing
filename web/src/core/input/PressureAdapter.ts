/**
 * PressureAdapter — normalizes pressure values across different input devices.
 * Falls back to velocity-based pressure simulation when no hardware pressure available.
 */
export class PressureAdapter {
  private lastPoint: { x: number; y: number; time: number } | null = null;
  private readonly DEFAULT_PRESSURE = 0.5;

  /**
   * Get normalized pressure from a PointerEvent.
   * If the device doesn't support pressure (mouse), simulate based on velocity.
   */
  getPressure(e: PointerEvent): number {
    // Hardware pressure available (pen tablet, Apple Pencil, etc.)
    if (e.pointerType === 'pen' && e.pressure > 0) {
      return Math.max(0.1, Math.min(1, e.pressure));
    }

    // Touch can sometimes provide pressure
    if (e.pointerType === 'touch' && e.pressure > 0 && e.pressure < 1) {
      return Math.max(0.1, Math.min(1, e.pressure));
    }

    // Mouse — simulate pressure from velocity
    return this.simulateFromVelocity(e.clientX, e.clientY, e.timeStamp);
  }

  /**
   * Simulate pressure from drawing velocity.
   * Slower movement = higher pressure (more ink), faster = lighter.
   */
  private simulateFromVelocity(x: number, y: number, time: number): number {
    if (!this.lastPoint) {
      this.lastPoint = { x, y, time };
      return this.DEFAULT_PRESSURE;
    }

    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const dt = Math.max(1, time - this.lastPoint.time);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const velocity = distance / dt; // px/ms

    this.lastPoint = { x, y, time };

    // Map velocity to pressure: slow → high pressure, fast → low pressure
    // Typical velocity range: 0.1 (slow) to 5+ (fast)
    const pressure = 1 - Math.min(1, velocity / 3);
    return Math.max(0.1, Math.min(1, pressure));
  }

  /** Reset state (call on pointerup) */
  reset(): void {
    this.lastPoint = null;
  }

  /** Get tilt values from event (for pen input) */
  getTilt(e: PointerEvent): { tiltX: number; tiltY: number } | undefined {
    if (e.pointerType !== 'pen') return undefined;
    if (e.tiltX === 0 && e.tiltY === 0) return undefined;
    return { tiltX: e.tiltX, tiltY: e.tiltY };
  }
}
