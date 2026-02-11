import { create } from 'zustand';

interface InkState {
  /** Current ink level */
  ink: number;
  /** Maximum ink capacity */
  maxInk: number;
  /** Whether a "low ink" warning is showing */
  showLowInkWarning: boolean;

  setInk: (ink: number) => void;
  setMaxInk: (maxInk: number) => void;
  setShowLowInkWarning: (show: boolean) => void;
}

export const useInkStore = create<InkState>((set) => ({
  ink: 100,
  maxInk: 100,
  showLowInkWarning: false,

  setInk: (ink) => set({ ink }),
  setMaxInk: (maxInk) => set({ maxInk }),
  setShowLowInkWarning: (showLowInkWarning) => set({ showLowInkWarning }),
}));
