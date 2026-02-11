import type { ViewState, CoordinateConverter } from '../types';

/**
 * OverlayManager — synchronizes the Canvas overlay position with MapLibre GL.
 * Keeps the drawing canvas aligned with the map as it pans/zooms/rotates.
 */
export class OverlayManager {
  private canvas: HTMLCanvasElement | null = null;
  private container: HTMLElement | null = null;
  private converter: CoordinateConverter | null = null;

  /** Set the canvas element that overlays the map */
  setCanvas(canvas: HTMLCanvasElement, container: HTMLElement): void {
    this.canvas = canvas;
    this.container = container;
    this.resize();
  }

  /** Set the coordinate converter from the map adapter */
  setConverter(converter: CoordinateConverter): void {
    this.converter = converter;
  }

  /**
   * Sync canvas size with container.
   * Call on window resize or container size change.
   */
  resize(): void {
    if (!this.canvas || !this.container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }

  /**
   * Sync the canvas CSS transform with the current map view state.
   * This is a simplified overlay approach — the canvas covers the map exactly
   * and is repositioned on each map move.
   */
  syncTransform(_viewState: ViewState): void {
    // For the overlay approach, the canvas always covers the full container.
    // Transform is handled at render time by converting geo → screen coordinates.
    // No CSS transform needed in this approach.
  }

  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /** Get 2D context for the canvas */
  getContext(): CanvasRenderingContext2D | null {
    return this.canvas?.getContext('2d') ?? null;
  }

  /** Clean up */
  dispose(): void {
    this.canvas = null;
    this.container = null;
    this.converter = null;
  }
}
