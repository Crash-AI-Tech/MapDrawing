'use client';

import { useActionState } from 'react';
import { register, type RegisterState } from '@/app/(auth)/register/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState<RegisterState | null, FormData>(register, null);

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">创建账号</h1>
        <p className="mt-1 text-sm text-muted-foreground">创建账号加入地图绘画</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reg-username">用户名</Label>
          <Input
            id="reg-username"
            name="userName"
            type="text"
            placeholder="你的名字"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email">邮箱</Label>
          <Input
            id="reg-email"
            name="email"
            type="email"
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-password">密码</Label>
          <Input
            id="reg-password"
            name="password"
            type="password"
            placeholder="至少6位"
            required
            minLength={6}
          />
        </div>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? '注册中...' : '注册'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        已有账号？{' '}
        <button
          onClick={onSwitchToLogin}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          登录
        </button>
      </p>
    </div>
  );
}
