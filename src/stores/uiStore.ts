import { create } from 'zustand';
import type { SyncState } from '@/core/types';

interface UIState {
  /** Whether the toolbar panel is expanded */
  toolbarExpanded: boolean;
  /** Whether brush settings panel is open */
  brushPanelOpen: boolean;
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

  setToolbarExpanded: (expanded: boolean) => void;
  setBrushPanelOpen: (open: boolean) => void;
  setColorPickerOpen: (open: boolean) => void;
  setUserMenuOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  clearToast: () => void;
  setSyncState: (state: SyncState) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toolbarExpanded: true,
  brushPanelOpen: false,
  colorPickerOpen: false,
  userMenuOpen: false,
  isLoading: false,
  toast: null,
  syncState: 'disconnected',

  setToolbarExpanded: (toolbarExpanded) => set({ toolbarExpanded }),
  setBrushPanelOpen: (brushPanelOpen) => set({ brushPanelOpen }),
  setColorPickerOpen: (colorPickerOpen) => set({ colorPickerOpen }),
  setUserMenuOpen: (userMenuOpen) => set({ userMenuOpen }),
  setLoading: (isLoading) => set({ isLoading }),
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
  setSyncState: (syncState) => set({ syncState }),
}));
