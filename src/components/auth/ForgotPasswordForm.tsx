'use client';

import { useActionState, useEffect } from 'react';
import {
  requestPasswordReset,
  type ResetRequestState,
} from '@/app/(auth)/reset-password/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, Send } from 'lucide-react';

interface ForgotPasswordFormProps {
  lang: 'zh' | 'en';
  onCodeSent?: (email: string) => void;
  onBack?: () => void;
}

const t = {
  zh: {
    label: '注册邮箱',
    placeholder: 'your@email.com',
    sending: '发送中...',
    send: '发送验证码',
    back: '返回登录',
  },
  en: {
    label: 'Registered Email',
    placeholder: 'your@email.com',
    sending: 'Sending...',
    send: 'Send Code',
    back: 'Back to Login',
  },
};

/**
 * 忘记密码 — 输入邮箱发送验证码
 */
export default function ForgotPasswordForm({
  lang,
  onCodeSent,
  onBack,
}: ForgotPasswordFormProps) {
  const [state, formAction, isPending] = useActionState<ResetRequestState | null, FormData>(
    requestPasswordReset,
    null
  );
  const d = t[lang];

  useEffect(() => {
    if (state?.step === 'code' && state.email) {
      onCodeSent?.(state.email);
    }
  }, [state, onCodeSent]);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email" className="text-xs font-medium text-gray-600">
            {d.label}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="reset-email"
              name="email"
              type="email"
              placeholder={d.placeholder}
              required
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
              {d.sending}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {d.send}
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
        {d.back}
      </button>
    </div>
  );
}
