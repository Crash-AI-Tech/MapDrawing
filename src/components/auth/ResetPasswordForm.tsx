'use client';

import { useActionState, useEffect, useRef, useState, useCallback } from 'react';
import {
  resetPassword,
  type ResetPasswordState,
} from '@/app/(auth)/reset-password/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ResetPasswordFormProps {
  email: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

/**
 * 重置密码 — 验证码 + 新密码
 */
export default function ResetPasswordForm({
  email,
  onSuccess,
  onBack,
}: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState<ResetPasswordState | null, FormData>(
    resetPassword,
    null
  );
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (state?.success) {
      onSuccess?.();
    }
  }, [state, onSuccess]);

  // 自动聚焦
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInput = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const digit = value.slice(-1);
      const next = [...code];
      next[index] = digit;
      setCode(next);
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [code]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (!text) return;
      const next = [...code];
      for (let i = 0; i < 6; i++) {
        next[i] = text[i] || '';
      }
      setCode(next);
      inputRefs.current[Math.min(text.length, 5)]?.focus();
    },
    [code]
  );

  const fullCode = code.join('');

  return (
    <div className="space-y-5">
      {/* 邮箱提示 */}
      <div className="rounded-xl bg-gray-50/80 px-4 py-3 text-center backdrop-blur-sm">
        <p className="text-xs text-gray-500">验证码已发送至</p>
        <p className="mt-0.5 text-sm font-medium text-gray-800">{email}</p>
      </div>

      {/* 验证码输入 */}
      <div>
        <Label className="mb-2 block text-xs font-medium text-gray-600">验证码</Label>
        <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-12 w-11 rounded-xl border border-white/60 bg-white/50 text-center text-xl font-bold text-gray-900 shadow-sm backdrop-blur-sm transition-all focus:border-gray-300 focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          ))}
        </div>
      </div>

      {/* 新密码 + 提交 */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={fullCode} />

        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-xs font-medium text-gray-600">
            新密码
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="new-password"
              name="password"
              type="password"
              placeholder="至少6位"
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
        {state?.success && (
          <div className="rounded-lg bg-green-50/80 px-3 py-2 text-center text-sm text-green-600 backdrop-blur-sm">
            密码重置成功！请使用新密码登录
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending || fullCode.length !== 6}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 font-medium text-white shadow-lg shadow-gray-900/20 transition-all hover:shadow-xl hover:shadow-gray-900/30"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              重置中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              重置密码
            </span>
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center justify-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回
      </button>
    </div>
  );
}
