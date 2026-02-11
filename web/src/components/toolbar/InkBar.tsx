'use client';

import { useInkStore } from '@/stores/inkStore';
import { cn } from '@/lib/utils/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Droplets } from 'lucide-react';

/**
 * InkBar — displays the current ink level as a compact bar in the toolbar.
 * Shows a gradient bar (blue → red) and numeric value.
 */
export default function InkBar() {
  const ink = useInkStore((s) => s.ink);
  const maxInk = useInkStore((s) => s.maxInk);

  const ratio = maxInk > 0 ? ink / maxInk : 0;
  const percent = Math.round(ratio * 100);

  // Color transitions: blue → yellow → red
  const getBarColor = () => {
    if (ratio > 0.5) return 'bg-blue-500';
    if (ratio > 0.2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-1 py-0.5">
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
                getBarColor(),
                ratio <= 0.2 && ink > 0 && 'animate-pulse'
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span
            className={cn(
              'text-[9px] tabular-nums font-medium',
              ratio > 0.5
                ? 'text-muted-foreground'
                : ratio > 0.2
                  ? 'text-yellow-600'
                  : 'text-red-500'
            )}
          >
            {ink.toFixed(2)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>墨水 {ink.toFixed(2)}/{maxInk}</p>
        <p className="text-xs text-muted-foreground">每18秒恢复1点</p>
      </TooltipContent>
    </Tooltip>
  );
}
