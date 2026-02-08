'use client';

import { useActionState, useEffect } from 'react';
import { login, type LoginState } from '@/app/(auth)/login/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowRight } from 'lucide-react';

interface LoginFormProps {
  lang: 'zh' | 'en';
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
  onVerifyRequired?: (email: string) => void;
  onSuccess?: () => void;
}

const t = {
  zh: {
    email: '邮箱',
    password: '密码',
    forgot: '忘记密码？',
    placeholderEmail: 'your@email.com',
    placeholderPwd: '••••••••',
    login: '登录',
    loggingIn: '登录中...',
    or: '或者',
    noAccount: '还没有账号？',
    register: '注册',
  },
  en: {
    email: 'Email',
    password: 'Password',
    forgot: 'Forgot?',
    placeholderEmail: 'your@email.com',
    placeholderPwd: '••••••••',
    login: 'Log in',
    loggingIn: 'Logging in...',
    or: 'OR',
    noAccount: 'No account yet?',
    register: 'Sign up',
  },
};

export default function LoginForm({
  lang,
  onSwitchToRegister,
  onForgotPassword,
  onVerifyRequired,
  onSuccess,
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<LoginState | null, FormData>(login, null);
  const d = t[lang];

  // 处理登录结果
  useEffect(() => {
    if (!state) return;
    if (state.step === 'verify' && state.email) {
      onVerifyRequired?.(state.email);
    } else if (!state.error && !state.step) {
      // 登录成功
      onSuccess?.();
    }
  }, [state, onVerifyRequired, onSuccess]);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-xs font-medium text-gray-600">
            {d.email}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="login-email"
              name="email"
              type="email"
              placeholder={d.placeholderEmail}
              required
              className="h-11 rounded-xl border-white/60 bg-white/50 pl-10 shadow-sm backdrop-blur-sm placeholder:text-gray-300 focus:border-gray-300 focus:bg-white/80 focus:ring-1 focus:ring-gray-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-xs font-medium text-gray-600">
              {d.password}
            </Label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-gray-400 transition-colors hover:text-gray-600"
            >
              {d.forgot}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="login-password"
              name="password"
              type="password"
              placeholder={d.placeholderPwd}
              required
              minLength={6}
              className="h-11 rounded-xl border-white/60 bg-white/50 pl-10 shadow-sm backdrop-blur-sm placeholder:text-gray-300 focus:border-gray-300 focus:bg-white/80 focus:ring-1 focus:ring-gray-200"
            />
          </div>
        </div>

        {state?.error && (
          <div className="rounded-lg bg-red-50/80 px-3 py-2 text-sm text-red-600 backdrop-blur-sm">
            {state.error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 font-medium text-white shadow-lg shadow-gray-900/20 transition-all hover:shadow-xl hover:shadow-gray-900/30"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {d.loggingIn}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {d.login}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 py-1 rounded-full border border-gray-200/60 text-gray-500 shadow-sm">
            {d.or}
          </span>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500">
        {d.noAccount}{' '}
        <button
          onClick={onSwitchToRegister}
          className="font-semibold text-gray-900 transition-colors hover:text-gray-700"
        >
          {d.register}
        </button>
      </p>
    </div>
  );
}
