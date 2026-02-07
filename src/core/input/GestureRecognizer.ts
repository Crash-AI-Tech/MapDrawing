export type GestureType =
  | 'draw'           // Single touch / mouse left button drag
  | 'pan'            // Two-finger pan / middle mouse drag
  | 'pinch-zoom'     // Two-finger pinch
  | 'undo'           // Three-finger tap (mobile)
  | 'none';

interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

/**
 * GestureRecognizer — distinguishes between drawing, panning, zooming, and undo gestures.
 * Works with PointerEvents for unified touch/mouse/pen handling.
 */
export class GestureRecognizer {
  private activePointers = new Map<number, TouchPoint>();
  private initialPinchDistance: number | null = null;
  private currentGesture: GestureType = 'none';
  private drawCancelled = false;

  /** Register a new pointer (pointerdown) */
  pointerDown(e: PointerEvent): GestureType {
    this.activePointers.set(e.pointerId, {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
    });

    const count = this.activePointers.size;

    if (count === 1) {
      // Single pointer
      if (e.pointerType === 'mouse' && e.button === 1) {
        // Middle mouse button → pan
        this.currentGesture = 'pan';
      } else if (e.pointerType === 'mouse' && e.button === 0) {
        // Left mouse button → draw
        this.currentGesture = 'draw';
        this.drawCancelled = false;
      } else if (e.pointerType === 'pen') {
        this.currentGesture = 'draw';
        this.drawCancelled = false;
      } else if (e.pointerType === 'touch') {
        this.currentGesture = 'draw';
        this.drawCancelled = false;
      }
    } else if (count === 2) {
      // Two pointers → cancel draw, start pinch/pan
      this.drawCancelled = true;
      this.currentGesture = 'pinch-zoom';
      this.initialPinchDistance = this.calculatePinchDistance();
    } else if (count === 3) {
      // Three fingers → undo
      this.drawCancelled = true;
      this.currentGesture = 'undo';
    }

    return this.currentGesture;
  }

  /** Update a pointer position (pointermove) */
  pointerMove(e: PointerEvent): GestureType {
    const point = this.activePointers.get(e.pointerId);
    if (point) {
      point.x = e.clientX;
      point.y = e.clientY;
    }
    return this.currentGesture;
  }

  /** Remove a pointer (pointerup/pointercancel) */
  pointerUp(e: PointerEvent): GestureType {
    const gesture = this.currentGesture;
    this.activePointers.delete(e.pointerId);

    if (this.activePointers.size === 0) {
      this.currentGesture = 'none';
      this.initialPinchDistance = null;
      this.drawCancelled = false;
    } else if (this.activePointers.size === 1) {
      this.currentGesture = 'pan';
    }

    return gesture;
  }

  /** Get the current gesture */
  getCurrentGesture(): GestureType {
    return this.currentGesture;
  }

  /** Whether the current draw gesture has been cancelled by multi-touch */
  isDrawCancelled(): boolean {
    return this.drawCancelled;
  }

  /** Get pinch zoom scale factor (relative to initial distance) */
  getPinchScale(): number {
    if (!this.initialPinchDistance) return 1;
    const current = this.calculatePinchDistance();
    return current / this.initialPinchDistance;
  }

  /** Get number of active pointers */
  getPointerCount(): number {
    return this.activePointers.size;
  }

  /** Reset all state */
  reset(): void {
    this.activePointers.clear();
    this.initialPinchDistance = null;
    this.currentGesture = 'none';
    this.drawCancelled = false;
  }

  private calculatePinchDistance(): number {
    const points = [...this.activePointers.values()];
    if (points.length < 2) return 0;
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
