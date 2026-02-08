'use client';

import { useActionState, useEffect } from 'react';
import { register, type RegisterState } from '@/app/(auth)/register/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';

interface RegisterFormProps {
  lang: 'zh' | 'en';
  onSwitchToLogin?: () => void;
  onVerifyRequired?: (email: string) => void;
}

const t = {
  zh: {
    username: '用户名',
    email: '邮箱',
    password: '密码',
    placeholderUser: '你的名字',
    placeholderEmail: 'your@email.com',
    placeholderPwd: '至少6位',
    register: '注册',
    registering: '注册中...',
    or: '或者',
    hasAccount: '已有账号？',
    login: '登录',
  },
  en: {
    username: 'Username',
    email: 'Email',
    password: 'Password',
    placeholderUser: 'Your name',
    placeholderEmail: 'your@email.com',
    placeholderPwd: 'Min 6 chars',
    register: 'Sign up',
    registering: 'Signing up...',
    or: 'OR',
    hasAccount: 'Already have an account?',
    login: 'Log in',
  },
};

export default function RegisterForm({
  lang,
  onSwitchToLogin,
  onVerifyRequired,
}: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState<RegisterState | null, FormData>(register, null);
  const d = t[lang];

  // 注册成功后跳转到验证步骤
  useEffect(() => {
    if (state?.step === 'verify' && state.email) {
      onVerifyRequired?.(state.email);
    }
  }, [state, onVerifyRequired]);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reg-username" className="text-xs font-medium text-gray-600">
            {d.username}
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="reg-username"
              name="userName"
              type="text"
              placeholder={d.placeholderUser}
              className="h-11 rounded-xl border-white/60 bg-white/50 pl-10 shadow-sm backdrop-blur-sm placeholder:text-gray-300 focus:border-gray-300 focus:bg-white/80 focus:ring-1 focus:ring-gray-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email" className="text-xs font-medium text-gray-600">
            {d.email}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="reg-email"
              name="email"
              type="email"
              placeholder={d.placeholderEmail}
              required
              className="h-11 rounded-xl border-white/60 bg-white/50 pl-10 shadow-sm backdrop-blur-sm placeholder:text-gray-300 focus:border-gray-300 focus:bg-white/80 focus:ring-1 focus:ring-gray-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-password" className="text-xs font-medium text-gray-600">
            {d.password}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="reg-password"
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
              {d.registering}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {d.register}
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
        {d.hasAccount}{' '}
        <button
          onClick={onSwitchToLogin}
          className="font-semibold text-gray-900 transition-colors hover:text-gray-700"
        >
          {d.login}
        </button>
      </p>
    </div>
  );
}
