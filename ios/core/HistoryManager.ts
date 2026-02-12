/**
 * HistoryManager — dual-stack Undo/Redo system.
 * Port of web/src/core/engine/HistoryManager.ts.
 *
 * Supports ADD_STROKE and DELETE_STROKE commands with a max stack depth of 100.
 */

import type { StrokeData } from './types';

export interface StrokeCommand {
  type: 'ADD_STROKE' | 'DELETE_STROKE';
  stroke: StrokeData;
}

export class HistoryManager {
  private undoStack: StrokeCommand[] = [];
  private redoStack: StrokeCommand[] = [];
  private maxSize: number;
  private onChange: ((canUndo: boolean, canRedo: boolean) => void) | null =
    null;

  constructor(
    maxSize = 100,
    onChange?: (canUndo: boolean, canRedo: boolean) => void
  ) {
    this.maxSize = maxSize;
    this.onChange = onChange ?? null;
  }

  /** Push a new command (clears redo stack) */
  push(cmd: StrokeCommand): void {
    this.undoStack.push(cmd);
    this.redoStack = [];
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.notify();
  }

  /** Undo the last command (returns the command to reverse) */
  undo(): StrokeCommand | null {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    this.redoStack.push(cmd);
    this.notify();
    return cmd;
  }

  /** Redo the last undone command */
  redo(): StrokeCommand | null {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    this.undoStack.push(cmd);
    this.notify();
    return cmd;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  private notify(): void {
    this.onChange?.(this.canUndo, this.canRedo);
  }
}
