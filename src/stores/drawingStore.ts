import { create } from 'zustand';

interface DrawingState {
  /** Active brush ID */
  activeBrushId: string;
  /** Active color */
  activeColor: string;
  /** Active opacity [0, 1] */
  activeOpacity: number;
  /** Active brush size */
  activeSize: number;
  /** Whether drawing mode is enabled */
  drawingMode: boolean;
  /** Whether the user is currently drawing */
  isDrawing: boolean;
  /** Undo/redo availability */
  canUndo: boolean;
  canRedo: boolean;
  /** Total stroke count */
  strokeCount: number;

  /** Engine undo/redo callbacks (registered after engine init) */
  _undoFn: (() => void) | null;
  _redoFn: (() => void) | null;

  setActiveBrush: (brushId: string) => void;
  setActiveColor: (color: string) => void;
  setActiveOpacity: (opacity: number) => void;
  setActiveSize: (size: number) => void;
  setDrawingMode: (enabled: boolean) => void;
  setIsDrawing: (drawing: boolean) => void;
  setCanUndo: (canUndo: boolean) => void;
  setCanRedo: (canRedo: boolean) => void;
  setStrokeCount: (count: number) => void;
  /** Register engine undo/redo handlers */
  registerEngineActions: (undoFn: () => void, redoFn: () => void) => void;
  /** Unregister engine undo/redo handlers */
  unregisterEngineActions: () => void;
  /** Undo action (calls engine) */
  undo: () => void;
  /** Redo action (calls engine) */
  redo: () => void;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  activeBrushId: 'pencil',
  activeColor: '#000000',
  activeOpacity: 1.0,
  activeSize: 3,
  drawingMode: true,
  isDrawing: false,
  canUndo: false,
  canRedo: false,
  strokeCount: 0,

  _undoFn: null,
  _redoFn: null,

  setActiveBrush: (activeBrushId) => set({ activeBrushId }),
  setActiveColor: (activeColor) => set({ activeColor }),
  setActiveOpacity: (activeOpacity) => set({ activeOpacity }),
  setActiveSize: (activeSize) => set({ activeSize }),
  setDrawingMode: (drawingMode) => set({ drawingMode }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setCanUndo: (canUndo) => set({ canUndo }),
  setCanRedo: (canRedo) => set({ canRedo }),
  setStrokeCount: (strokeCount) => set({ strokeCount }),

  registerEngineActions: (undoFn, redoFn) => set({ _undoFn: undoFn, _redoFn: redoFn }),
  unregisterEngineActions: () => set({ _undoFn: null, _redoFn: null }),
  undo: () => get()._undoFn?.(),
  redo: () => get()._redoFn?.(),
}));
