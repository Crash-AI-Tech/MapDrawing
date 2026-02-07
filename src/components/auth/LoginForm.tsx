'use client';

import { useActionState } from 'react';
import { login, type LoginState } from '@/app/(auth)/login/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<LoginState | null, FormData>(login, null);

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">登录</h1>
        <p className="mt-1 text-sm text-muted-foreground">登录后开始在地图上创作</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? '登录中...' : '登录'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        还没有账号？{' '}
        <button
          onClick={onSwitchToRegister}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          注册
        </button>
      </p>
    </div>
  );
}
