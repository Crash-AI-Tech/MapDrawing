'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import VerifyEmailForm from './VerifyEmailForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResetPasswordForm from './ResetPasswordForm';

export type AuthMode =
  | 'login'
  | 'register'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const modeConfig: Record<
  AuthMode,
  { title: string; description: string }
> = {
  login: { title: '欢迎回来', description: '登录后即可在地图上涂鸦和留言' },
  register: { title: '创建账号', description: '注册账号，开始你的创作之旅' },
  'verify-email': {
    title: '验证邮箱',
    description: '我们已向你的邮箱发送了 6 位验证码',
  },
  'forgot-password': {
    title: '找回密码',
    description: '输入注册邮箱，我们将发送验证码',
  },
  'reset-password': {
    title: '重置密码',
    description: '输入验证码和新密码',
  },
};

/**
 * AuthDialog — 白色液态玻璃质感的认证弹窗
 * 支持登录、注册、邮箱验证、忘记密码、重置密码 5 种模式
 */
export default function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const goToVerify = useCallback((email: string) => {
    setVerifyEmail(email);
    setMode('verify-email');
  }, []);

  const goToResetPassword = useCallback((email: string) => {
    setResetEmail(email);
    setMode('reset-password');
  }, []);

  const handleSuccess = useCallback(() => {
    onOpenChange(false);
    // 延迟关闭后刷新页面
    setTimeout(() => window.location.reload(), 300);
  }, [onOpenChange]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // 关闭弹窗时重置到登录
        setTimeout(() => setMode('login'), 200);
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  const { title, description } = modeConfig[mode];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[420px] border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-2xl sm:rounded-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 text-xl text-white shadow-lg">
            🎨
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1">
          {mode === 'login' && (
            <LoginForm
              onSwitchToRegister={() => setMode('register')}
              onForgotPassword={() => setMode('forgot-password')}
              onVerifyRequired={goToVerify}
              onSuccess={handleSuccess}
            />
          )}
          {mode === 'register' && (
            <RegisterForm
              onSwitchToLogin={() => setMode('login')}
              onVerifyRequired={goToVerify}
            />
          )}
          {mode === 'verify-email' && (
            <VerifyEmailForm
              email={verifyEmail}
              onSuccess={handleSuccess}
              onBack={() => setMode('login')}
            />
          )}
          {mode === 'forgot-password' && (
            <ForgotPasswordForm
              onCodeSent={goToResetPassword}
              onBack={() => setMode('login')}
            />
          )}
          {mode === 'reset-password' && (
            <ResetPasswordForm
              email={resetEmail}
              onSuccess={() => setMode('login')}
              onBack={() => setMode('forgot-password')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
