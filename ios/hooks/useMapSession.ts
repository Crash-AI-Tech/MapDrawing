import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { fetchProfile, getToken } from '@/lib/api';

export interface MapSession {
  token: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
}
/** Owns map-screen authentication hydration and profile refresh. */
export function useMapSession() {
  const { signOut } = useAuth();
  const [session, setSession] = useState<MapSession | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const profile = await fetchProfile();
        if (!cancelled) {
          setSession({ token, userId: profile.id, userName: profile.user_name, avatarUrl: profile.avatar_url });
        }
      } catch (error: unknown) {
        if ((error as { status?: number })?.status === 401) await signOut();
      }
    })();
    return () => { cancelled = true; };
  }, [signOut]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const token = await getToken();
        if (cancelled) return;
        if (!token) { setSession(null); return; }
        try {
          const profile = await fetchProfile();
          if (cancelled) return;
          setSession({ token, userId: profile.id, userName: profile.user_name, avatarUrl: profile.avatar_url });
          setAvatarVersion((version) => version + 1);
        } catch {
          // Initial hydration owns expired-session handling.
        }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  return { session, avatarVersion };
}
