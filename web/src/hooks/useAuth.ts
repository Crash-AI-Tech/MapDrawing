'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { AppUser } from '@/stores/authStore';

let profileRequest: Promise<void> | null = null;
let authInitialized = false;

/**
 * Multiple UI components consume useAuth. Keep one shared request so mounting the
 * canvas, toolbar, and user menu does not fan out duplicate /api/profile calls.
 */
function loadCurrentUser(force = false): Promise<void> {
  if (!force && authInitialized) return Promise.resolve();
  if (profileRequest) return profileRequest;

  profileRequest = (async () => {
    const store = useAuthStore.getState();
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) {
        store.clear();
        return;
      }

      const data = (await res.json()) as {
        id: string;
        email?: string;
        user_name?: string;
        avatar_url?: string | null;
      };
      const appUser: AppUser = {
        id: data.id,
        email: data.email ?? '',
        userName: data.user_name ?? 'Anonymous',
        avatarUrl: data.avatar_url ?? null,
      };
      store.setUser(appUser);
      store.setProfile({
        id: data.id,
        userName: data.user_name ?? 'Anonymous',
        avatarUrl: data.avatar_url ?? null,
      });
    } catch {
      store.clear();
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  })().finally(() => {
    authInitialized = true;
    profileRequest = null;
  });

  return profileRequest;
}

/**
 * useAuth — 管理 Lucia Auth 会话生命周期。
 *
 * 不再使用客户端 Supabase SDK。
 * 登录/注册通过 Server Action 完成（表单提交后自动设置 Cookie）。
 * 客户端只负责获取当前用户信息和登出。
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);
  const clear = useAuthStore((state) => state.clear);

  // === 初始化：获取当前用户信息 ===
  useEffect(() => {
    void loadCurrentUser();
  }, []);

  const refreshUser = useCallback(() => loadCurrentUser(true), []);

  // === 登录（通过 Server Action 表单提交，不需要客户端方法） ===
  // LoginForm 直接使用 form action 提交到 Server Action

  // === 登出 ===
  const signOut = useCallback(async () => {
    try {
      await fetch('/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clear();
    // 退出后保持在当前页面，刷新以重置状态
    window.location.reload();
  }, [clear]);

  return {
    user,
    profile,
    isLoading,
    signOut,
    refreshUser,
  };
}
