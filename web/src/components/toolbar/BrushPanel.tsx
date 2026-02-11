'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { useToolbar } from '@/hooks/useToolbar';
import { useDrawingStore } from '@/stores/drawingStore';
import { BRUSH_IDS } from '@/constants';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const BRUSH_META = [
  { id: BRUSH_IDS.PENCIL, label: '铅笔', icon: 'M' },
  { id: BRUSH_IDS.MARKER, label: '马克笔', icon: 'K' },
  { id: BRUSH_IDS.SPRAY, label: '喷枪', icon: 'S' },
  { id: BRUSH_IDS.HIGHLIGHTER, label: '荧光笔', icon: 'H' },
] as const;

/**
 * BrushPanel — brush type selection + size/opacity sliders.
 */
export default function BrushPanel() {
  const { activeBrushId, activeSize, activeOpacity, selectBrush, changeSize, changeOpacity, currentZoom } =
    useToolbar();

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors',
                'bg-primary text-primary-foreground shadow hover:bg-primary/90'
              )}
            >
              {BRUSH_META.find((b) => b.id === activeBrushId)?.icon ?? 'M'}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">笔刷设置</TooltipContent>
      </Tooltip>
      <PopoverContent side="bottom" align="start" className="w-64 space-y-4 border-white/50 bg-white/80 backdrop-blur-xl">
        {/* Brush type grid */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">笔刷类型</p>
          <div className="grid grid-cols-4 gap-1.5">
            {BRUSH_META.map((brush) => {
              const isDisabled = currentZoom < 18;
              return (
                <Tooltip key={brush.id}>
                  <TooltipTrigger asChild>
                    <button
                      disabled={isDisabled}
                      onClick={() => selectBrush(brush.id)}
                      className={cn(
                        'flex h-10 flex-col items-center justify-center rounded-md border text-xs transition-colors',
                        activeBrushId === brush.id
                          ? 'border-primary bg-primary/20 text-primary ring-2 ring-primary ring-offset-1'
                          : 'border-border hover:bg-accent hover:text-accent-foreground',
                        isDisabled && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <span className="text-base font-bold">{brush.icon}</span>
                      <span className="text-[10px]">{brush.label}</span>
                    </button>
                  </TooltipTrigger>
                  {isDisabled && (
                    <TooltipContent side="bottom" className="text-xs">
                      放大到 18 级解锁
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Size slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">大小</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {activeSize.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[activeSize]}
            onValueChange={([v]) => changeSize(v)}
            min={0.5}
            max={10}
            step={0.5}
          />
        </div>

        {/* Opacity slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">不透明度</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(activeOpacity * 100)}%
            </span>
          </div>
          <Slider
            value={[activeOpacity]}
            onValueChange={([v]) => changeOpacity(v)}
            min={0.05}
            max={1}
            step={0.05}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
