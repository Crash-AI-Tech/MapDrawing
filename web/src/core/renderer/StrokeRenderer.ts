import type { StrokeData } from '../types';
import type { BrushRegistry } from '../brushes';

/**
 * StrokeRenderer — renders strokes onto a Canvas2D context.
 * Used by RenderPipeline for both tile cache rendering and live preview.
 */
export class StrokeRenderer {
  private brushRegistry: BrushRegistry;

  constructor(brushRegistry: BrushRegistry) {
    this.brushRegistry = brushRegistry;
  }

  /** Render a single complete stroke, scaling size by zoom difference */
  renderStroke(
    ctx: CanvasRenderingContext2D,
    stroke: StrokeData,
    transform?: (geoX: number, geoY: number) => { x: number; y: number },
    currentZoom?: number
  ): void {
    const brush = this.brushRegistry.get(stroke.brushId);
    if (!brush) return;

    let renderStroke = stroke;
    if (transform) {
      renderStroke = {
        ...stroke,
        points: stroke.points.map((p) => {
          const { x, y } = transform(p.x, p.y);
          return { ...p, x, y };
        }),
      };
    }

    // Scale stroke size based on zoom difference from creation zoom
    if (currentZoom !== undefined && stroke.createdZoom) {
      const zoomScale = Math.pow(2, currentZoom - stroke.createdZoom);
      renderStroke = { ...renderStroke, size: renderStroke.size * zoomScale };
    }

    brush.renderFullStroke(ctx, renderStroke);
  }

  /** Render multiple strokes */
  renderStrokes(
    ctx: CanvasRenderingContext2D,
    strokes: StrokeData[],
    transform?: (geoX: number, geoY: number) => { x: number; y: number },
    currentZoom?: number
  ): void {
    for (const stroke of strokes) {
      this.renderStroke(ctx, stroke, transform, currentZoom);
    }
  }

  /** Clear and re-render all strokes in the given area */
  rerender(
    ctx: CanvasRenderingContext2D,
    strokes: StrokeData[],
    transform?: (geoX: number, geoY: number) => { x: number; y: number },
    currentZoom?: number
  ): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.renderStrokes(ctx, strokes, transform, currentZoom);
  }
}
