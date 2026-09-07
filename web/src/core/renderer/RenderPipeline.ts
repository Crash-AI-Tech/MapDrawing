import type { BrushRegistry } from '../brushes';
import { StrokeRenderer } from './StrokeRenderer';
import { OverlayManager } from './OverlayManager';
import type { ViewportManager } from '../engine/ViewportManager';
import type { StrokeManager } from '../engine/StrokeManager';
import type { ViewState } from '../types';
import { STROKE_HIDE_ZOOM_DIFF } from '@/constants';

export interface RenderPipelineConfig {
  brushRegistry: BrushRegistry;
  viewportManager: ViewportManager;
  strokeManager: StrokeManager;
}

/** Historical raster and live input are independent. During camera gestures,
 * transform the last snapshot; rebuild paths only after the camera settles.
 * Snapshot lifetime is local and tied to stroke revision (including deletion).
 */
export class RenderPipeline {
  readonly strokeRenderer: StrokeRenderer;
  readonly overlay = new OverlayManager();
  private compositeCanvas: HTMLCanvasElement | null = null;
  private activeCanvas: HTMLCanvasElement | null = null;
  private historyCanvas: HTMLCanvasElement | null = null;
  private snapshotView: ViewState | null = null;
  private snapshotKey = '';
  private rafId: number | null = null;
  interacting = false;
  strokesTransparent = false;
  limited = false;

  constructor(private config: RenderPipelineConfig) { this.strokeRenderer = new StrokeRenderer(config.brushRegistry); }
  init(composite: HTMLCanvasElement, active: HTMLCanvasElement, container: HTMLElement): void {
    this.compositeCanvas = composite;
    this.activeCanvas = active;
    this.historyCanvas = document.createElement('canvas');
    this.overlay.setCanvas(composite, container);
    this.resize();
  }
  getActiveContext(): CanvasRenderingContext2D | null { return this.activeCanvas?.getContext('2d') ?? null; }
  requestRender(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => { this.rafId = null; this.render(); });
  }
  render(): void {
    const composite = this.compositeCanvas;
    const history = this.historyCanvas;
    const ctx = composite?.getContext('2d');
    if (!composite || !history || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = composite;
    const view = this.config.viewportManager.getViewState();
    const key = JSON.stringify([view, width, height, this.config.strokeManager.revision]);
    const canTransform = this.interacting && this.snapshotView && this.snapshotView.bearing === view.bearing && this.snapshotView.pitch === view.pitch && history.width === width && history.height === height;
    if (this.snapshotKey !== key && !canTransform) {
      if (history.width !== width || history.height !== height) { history.width = width; history.height = height; }
      const hctx = history.getContext('2d');
      if (!hctx) return;
      hctx.setTransform(1, 0, 0, 1, 0, 0);
      hctx.clearRect(0, 0, width, height);
      hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const candidates = this.config.strokeManager.queryByBounds(this.config.viewportManager.getBounds())
        .filter(s => view.zoom >= s.createdZoom - STROKE_HIDE_ZOOM_DIFF)
        .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
      let points = 0;
      const strokes = [];
      for (const stroke of candidates) {
        if (strokes.length >= 3000 || points + stroke.points.length > 150_000) break;
        strokes.push(stroke); points += stroke.points.length;
      }
      this.limited = strokes.length < candidates.length;
      strokes.reverse();
      this.strokeRenderer.renderStrokes(hctx, strokes, (x, y) => this.config.viewportManager.geoToScreen(x, y) ?? { x: 0, y: 0 }, view.zoom);
      this.snapshotKey = key;
      this.snapshotView = view;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = this.strokesTransparent ? 0.3 : 1;
    if (canTransform && this.snapshotView) {
      const anchor = this.config.viewportManager.geoToScreen(this.snapshotView.lng, this.snapshotView.lat);
      const scale = 2 ** (view.zoom - this.snapshotView.zoom);
      if (anchor) { ctx.translate(anchor.x * dpr, anchor.y * dpr); ctx.scale(scale, scale); ctx.translate(-width / 2, -height / 2); }
    }
    ctx.drawImage(history, 0, 0);
    ctx.restore();
    if (this.activeCanvas?.width && this.activeCanvas.height) ctx.drawImage(this.activeCanvas, 0, 0);
  }
  resize(): void {
    this.overlay.resize();
    const canvas = this.activeCanvas;
    const parent = this.compositeCanvas?.parentElement;
    if (canvas && parent) {
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
      canvas.getContext('2d')?.scale(dpr, dpr);
    }
    this.snapshotKey = '';
    this.requestRender();
  }
  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.overlay.dispose();
    if (this.historyCanvas) { this.historyCanvas.width = 0; this.historyCanvas.height = 0; }
    this.historyCanvas = null; this.activeCanvas = null; this.compositeCanvas = null;
  }
}
