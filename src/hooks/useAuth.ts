'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { AppUser } from '@/stores/authStore';

/**
 * useAuth — 管理 Lucia Auth 会话生命周期。
 *
 * 不再使用客户端 Supabase SDK。
 * 登录/注册通过 Server Action 完成（表单提交后自动设置 Cookie）。
 * 客户端只负责获取当前用户信息和登出。
 */
export function useAuth() {
  const { user, profile, isLoading, setUser, setProfile, setLoading, clear } =
    useAuthStore();

  // === 初始化：获取当前用户信息 ===
  useEffect(() => {
    fetchCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 从 /api/profile 获取当前登录用户信息
   * Cookie 会自动携带，服务端验证 Session
   */
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
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
        setUser(appUser);
        setProfile({
          id: data.id,
          userName: data.user_name ?? 'Anonymous',
          avatarUrl: data.avatar_url ?? null,
        });
      } else {
        // 未登录或 Session 过期
        clear();
      }
    } catch {
      clear();
    } finally {
      setLoading(false);
    }
  }, [setUser, setProfile, setLoading, clear]);

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
    window.location.href = '/login';
  }, [clear]);

  return {
    user,
    profile,
    isLoading,
    signOut,
    refreshUser: fetchCurrentUser,
  };
}
