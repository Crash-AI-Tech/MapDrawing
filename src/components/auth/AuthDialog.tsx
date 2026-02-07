'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * AuthDialog — in-page login/register modal.
 * Used on the canvas page so guests don't leave the map when prompted to log in.
 */
export default function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? '登录' : '创建账号'}</DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? '登录后即可在地图上涂鸦和留言'
              : '注册一个账号，开始创作'}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
