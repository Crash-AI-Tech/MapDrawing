import type { StrokeData, GeoBounds } from '../types';
import type { BrushRegistry } from '../brushes';
import { StrokeRenderer } from './StrokeRenderer';
import { OverlayManager } from './OverlayManager';
import type { ViewportManager } from '../engine/ViewportManager';
import type { StrokeManager } from '../engine/StrokeManager';
import { STROKE_HIDE_ZOOM_DIFF } from '@/constants';

export interface RenderPipelineConfig {
  brushRegistry: BrushRegistry;
  viewportManager: ViewportManager;
  strokeManager: StrokeManager;
}

/**
 * RenderPipeline — orchestrates the 3-layer canvas rendering.
 *
 * Layer 1: tileCanvas — cached historical strokes as bitmap tiles
 * Layer 2: activeCanvas — current live stroke being drawn
 * Layer 3: compositeCanvas — composites both layers onto the map overlay
 */
export class RenderPipeline {
  readonly strokeRenderer: StrokeRenderer;
  readonly overlay: OverlayManager;

  private brushRegistry: BrushRegistry;
  private viewportManager: ViewportManager;
  private strokeManager: StrokeManager;

  private compositeCanvas: HTMLCanvasElement | null = null;
  private compositeCtx: CanvasRenderingContext2D | null = null;
  private activeCanvas: HTMLCanvasElement | null = null;
  private activeCtx: CanvasRenderingContext2D | null = null;

  private rafId: number | null = null;
  private needsRender = true;

  constructor(config: RenderPipelineConfig) {
    this.brushRegistry = config.brushRegistry;
    this.viewportManager = config.viewportManager;
    this.strokeManager = config.strokeManager;

    this.strokeRenderer = new StrokeRenderer(config.brushRegistry);
    this.overlay = new OverlayManager();
  }

  /** Initialize with DOM elements */
  init(
    compositeCanvas: HTMLCanvasElement,
    activeCanvas: HTMLCanvasElement,
    container: HTMLElement
  ): void {
    this.compositeCanvas = compositeCanvas;
    this.compositeCtx = compositeCanvas.getContext('2d');
    this.activeCanvas = activeCanvas;
    this.activeCtx = activeCanvas.getContext('2d');

    this.overlay.setCanvas(compositeCanvas, container);

    // Also resize active canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    activeCanvas.width = rect.width * dpr;
    activeCanvas.height = rect.height * dpr;
    activeCanvas.style.width = `${rect.width}px`;
    activeCanvas.style.height = `${rect.height}px`;
    const actCtx = activeCanvas.getContext('2d');
    if (actCtx) actCtx.scale(dpr, dpr);

    this.startRenderLoop();
  }

  /** Get the active canvas context for live drawing */
  getActiveContext(): CanvasRenderingContext2D | null {
    return this.activeCtx;
  }

  /** Request a re-render on the next frame */
  requestRender(): void {
    this.needsRender = true;
  }

  /** Force immediate render */
  render(): void {
    if (!this.compositeCtx || !this.compositeCanvas) return;

    const width = this.compositeCanvas.width;
    const height = this.compositeCanvas.height;
    const dpr = window.devicePixelRatio || 1;

    // Clear composite
    this.compositeCtx.clearRect(0, 0, width, height);

    // Get visible strokes
    const bounds = this.viewportManager.getBounds();
    const currentZoom = this.viewportManager.zoom;
    let visibleStrokes = this.strokeManager.queryByBounds(bounds);

    // Filter out strokes that are too far above current zoom (hide when zoomed out)
    visibleStrokes = visibleStrokes.filter(
      (s) => currentZoom >= s.createdZoom - STROKE_HIDE_ZOOM_DIFF
    );

    // Sort by createdAt ascending so newer strokes render on top of older ones
    visibleStrokes.sort((a, b) => a.createdAt - b.createdAt);

    // Build transform: geo → screen
    const transform = (geoX: number, geoY: number) => {
      const result = this.viewportManager.geoToScreen(geoX, geoY);
      return result ?? { x: 0, y: 0 };
    };

    // Render all visible strokes to composite canvas
    this.compositeCtx.save();
    // Reset scale since we'll work in CSS pixels
    this.compositeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.strokeRenderer.renderStrokes(this.compositeCtx, visibleStrokes, transform, currentZoom);
    this.compositeCtx.restore();

    // Composite active canvas on top
    if (this.activeCanvas && this.activeCanvas.width > 0 && this.activeCanvas.height > 0) {
      this.compositeCtx.drawImage(this.activeCanvas, 0, 0);
    }

    this.needsRender = false;
  }

  /** Handle window/container resize */
  resize(): void {
    this.overlay.resize();

    if (this.activeCanvas && this.compositeCanvas) {
      const parent = this.compositeCanvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        const rect = parent.getBoundingClientRect();

        this.activeCanvas.width = rect.width * dpr;
        this.activeCanvas.height = rect.height * dpr;
        this.activeCanvas.style.width = `${rect.width}px`;
        this.activeCanvas.style.height = `${rect.height}px`;
        const ctx = this.activeCanvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    }

    this.requestRender();
  }

  /** Clean up */
  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.overlay.dispose();
    this.compositeCanvas = null;
    this.compositeCtx = null;
    this.activeCanvas = null;
    this.activeCtx = null;
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (this.needsRender) {
        this.render();
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }
}
