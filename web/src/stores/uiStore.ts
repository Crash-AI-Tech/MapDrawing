import { create } from 'zustand';
import type { SyncState } from '@/core/types';
import type { MapLocation } from '@niubi/shared';

interface UIState {
  /** Whether the toolbar panel is expanded */
  toolbarExpanded: boolean;
  /** Whether color picker is open */
  colorPickerOpen: boolean;
  /** Whether user menu is open */
  userMenuOpen: boolean;
  /** Global loading state */
  isLoading: boolean;
  /** Toast message */
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;
  /** Sync connection state */
  syncState: SyncState;
  /** Current map zoom level (shared for toolbar gating) */
  currentZoom: number;
  contentLimited: boolean;
  hasPractice: boolean;
  setHasPractice: (value: boolean) => void;
  mapLocation: MapLocation | null;
  setMapLocation: (location: MapLocation) => void;
  setContentLimited: (limited: boolean) => void;

  setToolbarExpanded: (expanded: boolean) => void;
  setColorPickerOpen: (open: boolean) => void;
  setUserMenuOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  clearToast: () => void;
  setSyncState: (state: SyncState) => void;
  setCurrentZoom: (zoom: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toolbarExpanded: true,
  colorPickerOpen: false,
  userMenuOpen: false,
  isLoading: false,
  toast: null,
  syncState: 'disconnected',
  currentZoom: 14,
  contentLimited: false,
  hasPractice: false,
  setHasPractice: (hasPractice) => set({ hasPractice }),
  mapLocation: null,
  setMapLocation: (mapLocation) => set({ mapLocation }),
  setContentLimited: (contentLimited) => set({ contentLimited }),

  setToolbarExpanded: (toolbarExpanded) => set({ toolbarExpanded }),
  setColorPickerOpen: (colorPickerOpen) => set({ colorPickerOpen }),
  setUserMenuOpen: (userMenuOpen) => set({ userMenuOpen }),
  setLoading: (isLoading) => set({ isLoading }),
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
  setSyncState: (syncState) => set({ syncState }),
  setCurrentZoom: (currentZoom) => set({ currentZoom }),
}));
