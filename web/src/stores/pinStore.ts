import { create } from 'zustand';
import { PIN_COLORS } from '@/constants';

export interface MapPin {
  id: string;
  userId: string;
  userName: string;
  lng: number;
  lat: number;
  message: string;
  color: string;
  createdAt: number;
}

interface PinState {
  /** All loaded pins */
  pins: MapPin[];
  /** Whether pin placement mode is active */
  placingPin: boolean;
  /** Selected pin for viewing */
  selectedPin: MapPin | null;
  /** Current pin color for placement (used for cursor) */
  pinColor: string;

  setPins: (pins: MapPin[]) => void;
  addPin: (pin: MapPin) => void;
  setPlacingPin: (placing: boolean) => void;
  setSelectedPin: (pin: MapPin | null) => void;
  setPinColor: (color: string) => void;
}

export const usePinStore = create<PinState>((set, get) => ({
  pins: [],
  placingPin: false,
  selectedPin: null,
  pinColor: PIN_COLORS[0],

  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((s) => ({ pins: [pin, ...s.pins] })),
  setPlacingPin: (placingPin) => set({ placingPin }),
  setSelectedPin: (selectedPin) => set({ selectedPin }),
  setPinColor: (pinColor) => set({ pinColor }),
}));
