'use client';

import { useActionState, useEffect, useRef, useState, useCallback } from 'react';
import {
  verifyEmail,
  resendVerificationCode,
  type VerifyState,
} from '@/app/(auth)/verify/actions';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

interface VerifyEmailFormProps {
  email: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

/**
 * 6 位验证码输入 — 白色液态玻璃风格
 */
export default function VerifyEmailForm({
  email,
  onSuccess,
  onBack,
}: VerifyEmailFormProps) {
  const [state, formAction, isPending] = useActionState<VerifyState | null, FormData>(verifyEmail, null);
  const [resendState, resendAction, isResending] = useActionState<VerifyState | null, FormData>(
    resendVerificationCode,
    null
  );

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 验证成功
  useEffect(() => {
    if (state?.success) {
      onSuccess?.();
    }
  }, [state, onSuccess]);

  // 重发成功后启动倒计时
  useEffect(() => {
    if (resendState?.success) {
      setCooldown(60);
    }
  }, [resendState]);

  // 倒计时
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 自动聚焦第一个输入框
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
      const focusIndex = Math.min(text.length, 5);
      inputRefs.current[focusIndex]?.focus();
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

      {/* 6位验证码输入框 */}
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

      {/* 提交验证码 */}
      <form action={formAction}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={fullCode} />
        <Button
          type="submit"
          disabled={isPending || fullCode.length !== 6}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 font-medium text-white shadow-lg shadow-gray-900/20 transition-all hover:shadow-xl hover:shadow-gray-900/30"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              验证中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              验证邮箱
            </span>
          )}
        </Button>
      </form>

      {/* 错误信息 */}
      {state?.error && (
        <div className="rounded-lg bg-red-50/80 px-3 py-2 text-center text-sm text-red-600 backdrop-blur-sm">
          {state.error}
        </div>
      )}
      {resendState?.error && (
        <div className="rounded-lg bg-red-50/80 px-3 py-2 text-center text-sm text-red-600 backdrop-blur-sm">
          {resendState.error}
        </div>
      )}
      {resendState?.success && (
        <div className="rounded-lg bg-green-50/80 px-3 py-2 text-center text-sm text-green-600 backdrop-blur-sm">
          验证码已重新发送
        </div>
      )}

      {/* 重发 + 返回 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={isResending || cooldown > 0}
            className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 disabled:text-gray-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `${cooldown}s 后重试` : '重新发送'}
          </button>
        </form>
      </div>
    </div>
  );
}
