import { BaseBrush } from './BaseBrush';
import { PencilBrush } from './PencilBrush';
import { EraserBrush } from './EraserBrush';

/**
 * BrushRegistry — manages pluggable brush types.
 * Register new brushes with `registry.register(new MyBrush())`.
 *
 * NOTE: Only `pencil` and `eraser` are actively supported.
 * Legacy brush IDs (marker, spray, highlighter) fall back to pencil
 * rendering via `getOrFallback()`.
 */
export class BrushRegistry {
  private brushes = new Map<string, BaseBrush>();

  register(brush: BaseBrush): void {
    this.brushes.set(brush.id, brush);
  }

  get(id: string): BaseBrush | undefined {
    return this.brushes.get(id);
  }

  /**
   * Get a brush by id, falling back to pencil for any unregistered / legacy types.
   * This ensures old strokes (marker, spray, highlighter) still render.
   */
  getOrFallback(id: string): BaseBrush {
    return this.brushes.get(id) ?? this.brushes.get('pencil')!;
  }

  getAll(): BaseBrush[] {
    return [...this.brushes.values()];
  }

  has(id: string): boolean {
    return this.brushes.has(id);
  }
}

/**
 * Create a BrushRegistry pre-loaded with the supported brushes:
 * pencil + eraser.
 */
export function createDefaultBrushRegistry(): BrushRegistry {
  const registry = new BrushRegistry();
  registry.register(new PencilBrush());
  registry.register(new EraserBrush());
  return registry;
}
