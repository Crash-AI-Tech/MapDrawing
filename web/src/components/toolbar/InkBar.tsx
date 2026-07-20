'use client';

import { useState, useEffect, useRef } from 'react';
import { useInkStore } from '@/stores/inkStore';
import { cn } from '@/lib/utils/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Droplet } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const REGEN_INTERVAL_S = 18;

/**
 * InkBar — floating ink status displayed above the dock.
 * Uses the same green droplet + progress treatment as iOS.
 * Low ink (< 20%): pulsing animation.
 * Empty ink: shake animation.
 */
export default function InkBar() {
  const { t } = useI18n();
  const ink = useInkStore((s) => s.ink);
  const maxInk = useInkStore((s) => s.maxInk);
  const [countdown, setCountdown] = useState(REGEN_INTERVAL_S);
  const [shaking, setShaking] = useState(false);
  const prevInkRef = useRef(ink);

  const ratio = maxInk > 0 ? ink / maxInk : 0;
  const percent = Math.round(ratio * 100);

  // Countdown to next regen tick
  useEffect(() => {
    if (ink >= maxInk) {
      setCountdown(REGEN_INTERVAL_S);
      return;
    }
    setCountdown(REGEN_INTERVAL_S);
    const timer = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REGEN_INTERVAL_S : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [ink, maxInk]);

  // Shake effect when ink depletes to 0
  useEffect(() => {
    if (prevInkRef.current > 0 && ink <= 0) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 500);
      return () => clearTimeout(t);
    }
    prevInkRef.current = ink;
  }, [ink]);

  const isLow = ratio <= 0.2;
  const isEmpty = ink <= 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="progressbar"
          aria-label={t('inkLabel')}
          aria-valuemin={0}
          aria-valuemax={maxInk}
          aria-valuenow={ink}
          className={cn(
            'liquid-glass relative flex h-8 w-[7.5rem] items-center gap-1.5 rounded-full px-2',
            isLow && !isEmpty && 'animate-pulse',
            shaking && 'animate-[shake_0.3s_ease-in-out_2]'
          )}
          style={shaking ? {
            animation: 'shake 0.3s ease-in-out 0s 2',
          } : undefined}
        >
          <Droplet className="h-3 w-3 shrink-0 fill-emerald-500 text-emerald-600" />
          {/* Horizontal bar showing ink level */}
          <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-emerald-950/10">
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="flex h-6 w-7 shrink-0 flex-col justify-center text-right tabular-nums">
            <span className="text-[9px] font-bold leading-none text-emerald-700">{percent}%</span>
            {ink < maxInk && (
              <span className="mt-0.5 text-[7px] font-medium leading-none text-muted-foreground">
                {countdown}s
              </span>
            )}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{t('inkLabel')} {ink.toFixed(1)}/{maxInk} ({percent}%)</p>
        {ink < maxInk ? (
          <p className="text-xs text-muted-foreground">{t('inkNextRegen', { seconds: countdown })}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t('inkFull')}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
