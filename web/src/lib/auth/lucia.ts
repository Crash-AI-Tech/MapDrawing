/**
 * Lucia Auth 实例配置
 * 使用 D1 (SQLite) 适配器
 */

import { Lucia } from 'lucia';
import { D1Adapter } from '@lucia-auth/adapter-sqlite';

export function createLucia(db: D1Database) {
  const adapter = new D1Adapter(db, {
    user: 'users',
    session: 'sessions',
  });

  return new Lucia(adapter, {
    sessionCookie: {
      name: 'session',
      expires: false, // Session cookie（关闭浏览器过期）
      attributes: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    },
    getUserAttributes: (attributes) => ({
      email: attributes.email,
      userName: attributes.user_name,
      avatarUrl: attributes.avatar_url,
    }),
  });
}

// Lucia 类型声明
declare module 'lucia' {
  interface Register {
    Lucia: ReturnType<typeof createLucia>;
    DatabaseUserAttributes: {
      email: string;
      user_name: string;
      avatar_url: string | null;
    };
  }
}
