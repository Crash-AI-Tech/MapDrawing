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
  /** All loaded pins (already filtered for blocked users) */
  pins: MapPin[];
  /** Raw (unfiltered) pins from API */
  _rawPins: MapPin[];
  /** In-memory mirror of the authenticated user's server-side block list. */
  blockedUserIds: Set<string>;
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
  refreshBlocked: () => Promise<void>;
}

function filterPins(pins: MapPin[], blocked: Set<string>): MapPin[] {
  if (blocked.size === 0) return pins;
  return pins.filter((p) => !blocked.has(p.userId));
}

export const usePinStore = create<PinState>((set, get) => ({
  pins: [],
  _rawPins: [],
  blockedUserIds: new Set(),
  placingPin: false,
  selectedPin: null,
  pinColor: PIN_COLORS[0],

  setPins: (pins) => {
    const blocked = get().blockedUserIds;
    set({ _rawPins: pins, pins: filterPins(pins, blocked) });
  },
  addPin: (pin) => {
    const blocked = get().blockedUserIds;
    const newRaw = [pin, ...get()._rawPins];
    set({ _rawPins: newRaw, pins: filterPins(newRaw, blocked) });
  },
  setPlacingPin: (placingPin) => set({ placingPin }),
  setSelectedPin: (selectedPin) => set({ selectedPin }),
  setPinColor: (pinColor) => set({ pinColor }),
  refreshBlocked: async () => {
    const { Compliance } = await import('@/lib/compliance');
    const blocked = new Set(await Compliance.syncBlockedUsers());
    const raw = get()._rawPins;
    set({ blockedUserIds: blocked, pins: filterPins(raw, blocked) });
  },
}));
