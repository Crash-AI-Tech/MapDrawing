'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { useToolbar } from '@/hooks/useToolbar';
import { BRUSH_IDS } from '@/constants';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pencil, Eraser } from 'lucide-react';

/**
 * BrushPanel — a single toggle button that switches between pencil and eraser.
 * Size & opacity controls have been moved to ColorPicker.
 */
export default function BrushPanel() {
  const { activeBrushId, selectBrush } = useToolbar();

  const isEraser = activeBrushId === BRUSH_IDS.ERASER;

  const toggleBrush = useCallback(() => {
    selectBrush(isEraser ? BRUSH_IDS.PENCIL : BRUSH_IDS.ERASER);
  }, [isEraser, selectBrush]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggleBrush}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors',
            isEraser
              ? 'bg-orange-500 text-white shadow hover:bg-orange-400'
              : 'bg-primary text-primary-foreground shadow hover:bg-primary/90'
          )}
        >
          {isEraser ? <Eraser className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isEraser ? '切换到铅笔' : '切换到橡皮擦'}
      </TooltipContent>
    </Tooltip>
  );
}
