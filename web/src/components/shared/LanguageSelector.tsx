'use client';

import { Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useI18n, type Lang } from '@/lib/i18n';

const LANGUAGE_OPTIONS: ReadonlyArray<{ value: Lang; shortLabel: string; label: string }> = [
  { value: 'zh', shortLabel: '中', label: '中文' },
  { value: 'en', shortLabel: 'EN', label: 'English' },
  { value: 'ja', shortLabel: '日', label: '日本語' },
];

interface LanguageSelectorProps {
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export function LanguageSelector({
  className,
  showIcon = true,
  compact = false,
}: LanguageSelectorProps) {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="group"
      aria-label={t('language')}
    >
      {showIcon && <Globe2 className="mr-1 h-3.5 w-3.5 text-gray-500" aria-hidden />}
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLang(option.value)}
          className={cn(
            'rounded-full px-2 py-1 text-[11px] font-semibold transition-colors',
            lang === option.value
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-gray-500 hover:bg-violet-50 hover:text-violet-700',
          )}
          aria-pressed={lang === option.value}
          aria-label={option.label}
        >
          {compact ? option.shortLabel : option.label}
        </button>
      ))}
    </div>
  );
}
