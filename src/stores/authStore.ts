import { create } from 'zustand';

/**
 * 用户类型 (替代 Supabase User)
 */
export interface AppUser {
  id: string;
  email: string;
  userName: string;
  avatarUrl: string | null;
}

interface Profile {
  id: string;
  userName: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: AppUser | null;
  profile: Profile | null;
  isLoading: boolean;

  setUser: (user: AppUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, profile: null, isLoading: false }),
}));
