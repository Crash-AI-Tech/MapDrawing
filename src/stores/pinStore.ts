import { create } from 'zustand';

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

  setPins: (pins: MapPin[]) => void;
  addPin: (pin: MapPin) => void;
  setPlacingPin: (placing: boolean) => void;
  setSelectedPin: (pin: MapPin | null) => void;
}

export const usePinStore = create<PinState>((set, get) => ({
  pins: [],
  placingPin: false,
  selectedPin: null,

  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((s) => ({ pins: [pin, ...s.pins] })),
  setPlacingPin: (placingPin) => set({ placingPin }),
  setSelectedPin: (selectedPin) => set({ selectedPin }),
}));
