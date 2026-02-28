'use client';

import { useState, useEffect, useRef } from 'react';
import { useInkStore } from '@/stores/inkStore';
import { cn } from '@/lib/utils/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Droplets } from 'lucide-react';

const REGEN_INTERVAL_S = 18;

/**
 * InkBar — displays the current ink level as a compact bar in the toolbar.
 * Shows a gradient bar (blue → red), numeric value, and recovery countdown.
 * Low ink (< 20%): pulsing animation.
 * Empty ink: shake animation.
 */
export default function InkBar() {
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

  // Color transitions: blue → yellow → red
  const getBarColor = () => {
    if (ratio > 0.5) return 'bg-blue-500';
    if (ratio > 0.2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isLow = ratio <= 0.2;
  const isEmpty = ink <= 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1.5 px-1 py-0.5',
            isLow && !isEmpty && 'animate-pulse',
            shaking && 'animate-[shake_0.3s_ease-in-out_2]'
          )}
          style={shaking ? {
            animation: 'shake 0.3s ease-in-out 0s 2',
          } : undefined}
        >
          <Droplets
            className={cn(
              'h-3.5 w-3.5',
              ratio > 0.5
                ? 'text-blue-500'
                : ratio > 0.2
                  ? 'text-yellow-500'
                  : 'text-red-500'
            )}
          />
          {/* Horizontal bar showing ink level */}
          <div className="relative h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out',
                getBarColor()
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span
            className={cn(
              'text-[9px] tabular-nums font-bold min-w-[28px] text-right',
              ratio > 0.5
                ? 'text-muted-foreground'
                : ratio > 0.2
                  ? 'text-yellow-600'
                  : 'text-red-500'
            )}
          >
            {percent}%
          </span>
          {/* Recovery countdown when not full */}
          {ink < maxInk && (
            <span className="text-[8px] tabular-nums text-muted-foreground min-w-[16px]">
              {countdown}s
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>墨水 {ink.toFixed(1)}/{maxInk} ({percent}%)</p>
        {ink < maxInk ? (
          <p className="text-xs text-muted-foreground">{countdown}秒后恢复+1</p>
        ) : (
          <p className="text-xs text-muted-foreground">墨水已满</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
