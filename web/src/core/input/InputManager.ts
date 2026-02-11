import type { DrawingEngine } from '../engine/DrawingEngine';
import { GestureRecognizer } from './GestureRecognizer';
import { PressureAdapter } from './PressureAdapter';

export interface InputManagerConfig {
  /** The target element to listen for pointer events on */
  target: HTMLElement;
  /** The drawing engine to send input to */
  engine: DrawingEngine;
  /** Callback when a pan/zoom gesture is detected (let map handle it) */
  onMapInteraction?: (type: 'pan' | 'zoom') => void;
  /** Callback when undo gesture is detected */
  onUndoGesture?: () => void;
}

/**
 * InputManager — unified input pipeline.
 * Converts DOM PointerEvents → Drawing Engine calls.
 * Handles gesture recognition, pressure adaptation, and coalesced events.
 */
export class InputManager {
  private target: HTMLElement;
  private engine: DrawingEngine;
  private gesture: GestureRecognizer;
  private pressure: PressureAdapter;
  private onMapInteraction?: (type: 'pan' | 'zoom') => void;
  private onUndoGesture?: () => void;

  private isDrawing = false;
  private enabled = true;

  // Bound handlers for cleanup
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundPointerCancel: (e: PointerEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundContextMenu: (e: Event) => void;

  constructor(config: InputManagerConfig) {
    this.target = config.target;
    this.engine = config.engine;
    this.gesture = new GestureRecognizer();
    this.pressure = new PressureAdapter();
    this.onMapInteraction = config.onMapInteraction;
    this.onUndoGesture = config.onUndoGesture;

    // Bind handlers
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundPointerCancel = this.handlePointerCancel.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundContextMenu = (e: Event) => e.preventDefault();

    this.attach();
  }

  /** Enable/disable input processing */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.isDrawing) {
      this.engine.cancelStroke();
      this.isDrawing = false;
    }
  }

  /** Attach event listeners */
  private attach(): void {
    this.target.addEventListener('pointerdown', this.boundPointerDown);
    this.target.addEventListener('pointermove', this.boundPointerMove);
    this.target.addEventListener('pointerup', this.boundPointerUp);
    this.target.addEventListener('pointercancel', this.boundPointerCancel);
    this.target.addEventListener('contextmenu', this.boundContextMenu);
    document.addEventListener('keydown', this.boundKeyDown);

    // Prevent default touch behaviors
    this.target.style.touchAction = 'none';
  }

  /** Detach event listeners */
  dispose(): void {
    this.target.removeEventListener('pointerdown', this.boundPointerDown);
    this.target.removeEventListener('pointermove', this.boundPointerMove);
    this.target.removeEventListener('pointerup', this.boundPointerUp);
    this.target.removeEventListener('pointercancel', this.boundPointerCancel);
    this.target.removeEventListener('contextmenu', this.boundContextMenu);
    document.removeEventListener('keydown', this.boundKeyDown);
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.enabled) return;

    // Capture pointer for tracking outside element
    this.target.setPointerCapture(e.pointerId);

    const gestureType = this.gesture.pointerDown(e);

    if (gestureType === 'draw') {
      const p = this.pressure.getPressure(e);
      const rect = this.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.engine.startStroke(x, y, p);
      this.isDrawing = true;
    } else if (gestureType === 'pinch-zoom' || gestureType === 'pan') {
      // Cancel any ongoing draw
      if (this.isDrawing) {
        this.engine.cancelStroke();
        this.isDrawing = false;
      }
      this.onMapInteraction?.(gestureType === 'pinch-zoom' ? 'zoom' : 'pan');
    } else if (gestureType === 'undo') {
      if (this.isDrawing) {
        this.engine.cancelStroke();
        this.isDrawing = false;
      }
      this.onUndoGesture?.();
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.enabled) return;

    this.gesture.pointerMove(e);

    if (!this.isDrawing || this.gesture.isDrawCancelled()) return;

    // Use coalesced events for higher resolution
    const coalescedEvents = e.getCoalescedEvents?.() ?? [e];
    const rect = this.target.getBoundingClientRect();

    for (const ce of coalescedEvents) {
      const p = this.pressure.getPressure(ce);
      const x = ce.clientX - rect.left;
      const y = ce.clientY - rect.top;
      this.engine.moveStroke(x, y, p);
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    this.target.releasePointerCapture(e.pointerId);
    this.gesture.pointerUp(e);

    if (this.isDrawing) {
      this.engine.endStroke();
      this.isDrawing = false;
    }

    this.pressure.reset();
  }

  private handlePointerCancel(e: PointerEvent): void {
    this.target.releasePointerCapture(e.pointerId);
    this.gesture.pointerUp(e);

    if (this.isDrawing) {
      this.engine.cancelStroke();
      this.isDrawing = false;
    }

    this.pressure.reset();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    const isMac = navigator.platform.includes('Mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.engine.undo();
    } else if (mod && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      this.engine.redo();
    } else if (mod && e.key === 'Z') {
      e.preventDefault();
      this.engine.redo();
    }
  }
}
