import type { StrokeData } from '../types';

/**
 * Command types for undo/redo
 */
export type Command =
  | { type: 'ADD_STROKE'; stroke: StrokeData }
  | { type: 'DELETE_STROKE'; stroke: StrokeData }
  | {
      type: 'UPDATE_STROKE';
      strokeId: string;
      before: Partial<StrokeData>;
      after: Partial<StrokeData>;
    };

export type HistoryListener = (canUndo: boolean, canRedo: boolean) => void;

/**
 * HistoryManager — immutable command stack for Undo/Redo.
 * Pure TypeScript, no framework dependencies.
 */
export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly maxSize: number;
  private listeners = new Set<HistoryListener>();

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /** Push a new command. Clears the redo stack. */
  push(cmd: Command): void {
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  /** Pop the last command from undo stack and push its inverse to redo */
  undo(): Command | null {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    this.redoStack.push(cmd);
    this.notify();
    return cmd;
  }

  /** Pop the last command from redo stack and push back to undo */
  redo(): Command | null {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    this.undoStack.push(cmd);
    this.notify();
    return cmd;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Subscribe to state changes */
  subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Clear all history */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  private notify(): void {
    const canUndo = this.canUndo();
    const canRedo = this.canRedo();
    this.listeners.forEach((l) => l(canUndo, canRedo));
  }
}
