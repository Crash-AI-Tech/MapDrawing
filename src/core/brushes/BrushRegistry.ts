import { BaseBrush } from './BaseBrush';
import { PencilBrush } from './PencilBrush';
import { MarkerBrush } from './MarkerBrush';
import { SprayBrush } from './SprayBrush';
import { HighlighterBrush } from './HighlighterBrush';

/**
 * BrushRegistry — manages pluggable brush types.
 * Register new brushes with `registry.register(new MyBrush())`.
 */
export class BrushRegistry {
  private brushes = new Map<string, BaseBrush>();

  register(brush: BaseBrush): void {
    this.brushes.set(brush.id, brush);
  }

  get(id: string): BaseBrush | undefined {
    return this.brushes.get(id);
  }

  getAll(): BaseBrush[] {
    return [...this.brushes.values()];
  }

  has(id: string): boolean {
    return this.brushes.has(id);
  }
}

/**
 * Create a BrushRegistry pre-loaded with all default brushes.
 */
export function createDefaultBrushRegistry(): BrushRegistry {
  const registry = new BrushRegistry();
  registry.register(new PencilBrush());
  registry.register(new MarkerBrush());
  registry.register(new SprayBrush());
  registry.register(new HighlighterBrush());
  return registry;
}
