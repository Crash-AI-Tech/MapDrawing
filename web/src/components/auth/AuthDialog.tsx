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
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';

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

const t = {
  zh: {
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
  },
  en: {
    login: { title: 'Welcome Back', description: 'Log in to draw and pin on the map' },
    register: { title: 'Create Account', description: 'Join us and start your creative journey' },
    'verify-email': {
      title: 'Verify Email',
      description: 'We sent a 6-digit code to your email',
    },
    'forgot-password': {
      title: 'Forgot Password',
      description: 'Enter your email to receive a code',
    },
    'reset-password': {
      title: 'Reset Password',
      description: 'Enter code and new password',
    },
  },
  ja: {
    login: { title: 'おかえりなさい', description: 'ログインして地図に描画やピンを追加しましょう' },
    register: { title: 'アカウントを作成', description: '参加して創作を始めましょう' },
    'verify-email': {
      title: 'メールを確認',
      description: 'メールに6桁の確認コードを送信しました',
    },
    'forgot-password': {
      title: 'パスワードをお忘れですか',
      description: '登録メールアドレスに確認コードを送信します',
    },
    'reset-password': {
      title: 'パスワードをリセット',
      description: '確認コードと新しいパスワードを入力してください',
    },
  },
};

export default function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const { lang } = useI18n();
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

  const handleSuccess = useCallback(async () => {
    // Keep the mounted canvas and its guest practice strokes alive across login.
    await refreshUser();
    onOpenChange(false);
  }, [onOpenChange, refreshUser]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setTimeout(() => setMode('login'), 200);
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  const { title, description } = t[lang][mode];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[420px] border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-2xl sm:rounded-2xl">
        {/* Language Switcher */}
        <LanguageSelector className="absolute left-4 top-4" compact showIcon={false} />

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
              lang={lang}
              onSwitchToRegister={() => setMode('register')}
              onForgotPassword={() => setMode('forgot-password')}
              onVerifyRequired={goToVerify}
              onSuccess={handleSuccess}
            />
          )}
          {mode === 'register' && (
            <RegisterForm
              lang={lang}
              onSwitchToLogin={() => setMode('login')}
              onVerifyRequired={goToVerify}
            />
          )}
          {mode === 'verify-email' && (
            <VerifyEmailForm
              lang={lang}
              email={verifyEmail}
              onSuccess={handleSuccess}
              onBack={() => setMode('login')}
            />
          )}
          {mode === 'forgot-password' && (
            <ForgotPasswordForm
              lang={lang}
              onCodeSent={goToResetPassword}
              onBack={() => setMode('login')}
            />
          )}
          {mode === 'reset-password' && (
            <ResetPasswordForm
              lang={lang}
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
