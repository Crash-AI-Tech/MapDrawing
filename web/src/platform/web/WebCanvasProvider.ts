import { eraserToolCursor, pencilToolCursor } from './toolCursors';

/**
 * WebCanvasProvider — manages DOM canvas elements for the overlay system.
 * Creates and positions the 3-layer canvas stack on top of the map.
 */
export class WebCanvasProvider {
  private container: HTMLElement | null = null;
  private compositeCanvas: HTMLCanvasElement | null = null;
  private activeCanvas: HTMLCanvasElement | null = null;
  private drawingEnabled = false;
  private drawingCursor = pencilToolCursor();

  /**
   * Initialize the canvas overlay within a container element.
   * Creates two canvas elements stacked on top of the map.
   */
  init(container: HTMLElement): {
    compositeCanvas: HTMLCanvasElement;
    activeCanvas: HTMLCanvasElement;
  } {
    this.container = container;

    // Create composite canvas (bottom layer — rendered strokes)
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.id = 'niubi-composite-canvas';
    this.compositeCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    `;

    // Create active canvas (top layer — live drawing + input capture)
    this.activeCanvas = document.createElement('canvas');
    this.activeCanvas.id = 'niubi-active-canvas';
    this.activeCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 6;
      pointer-events: none;
      cursor: default;
    `;

    container.appendChild(this.compositeCanvas);
    container.appendChild(this.activeCanvas);

    this.resize();

    return {
      compositeCanvas: this.compositeCanvas,
      activeCanvas: this.activeCanvas,
    };
  }

  /** Resize canvases to match container */
  resize(): void {
    if (!this.container || !this.compositeCanvas || !this.activeCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    for (const canvas of [this.compositeCanvas, this.activeCanvas]) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
  }

  /** Set pointer-events on the active canvas (enable/disable drawing) */
  setDrawingMode(enabled: boolean): void {
    this.drawingEnabled = enabled;
    if (this.activeCanvas) {
      this.activeCanvas.style.pointerEvents = enabled ? 'auto' : 'none';
      this.activeCanvas.style.cursor = enabled ? this.drawingCursor : 'default';
    }
  }

  /** Keep the input canvas cursor in sync with the selected drawing tool. */
  setBrushCursor(brushId: string): void {
    this.drawingCursor = brushId === 'eraser' ? eraserToolCursor() : pencilToolCursor();
    if (this.activeCanvas && this.drawingEnabled) {
      this.activeCanvas.style.cursor = this.drawingCursor;
    }
  }

  /** Get the composite canvas element */
  getCompositeCanvas(): HTMLCanvasElement | null {
    return this.compositeCanvas;
  }

  /** Get the active canvas element */
  getActiveCanvas(): HTMLCanvasElement | null {
    return this.activeCanvas;
  }

  /** Clean up DOM elements */
  dispose(): void {
    this.compositeCanvas?.remove();
    this.activeCanvas?.remove();
    this.compositeCanvas = null;
    this.activeCanvas = null;
    this.container = null;
    this.drawingEnabled = false;
  }
}
