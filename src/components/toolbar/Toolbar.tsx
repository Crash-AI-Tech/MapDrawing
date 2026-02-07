'use client';

import { useToolbar } from '@/hooks/useToolbar';
import { useDrawingStore } from '@/stores/drawingStore';
import { useAuthStore } from '@/stores/authStore';
import { usePinStore } from '@/stores/pinStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import BrushPanel from './BrushPanel';
import ColorPicker from './ColorPicker';
import InkBar from './InkBar';
import {
  Undo2,
  Redo2,
  MousePointer2,
  Pencil,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ToolbarProps {
  /** Called when a guest tries to draw — opens AuthDialog */
  onAuthRequired?: () => void;
}

/**
 * Toolbar — main floating toolbar on the left side.
 */
export default function Toolbar({ onAuthRequired }: ToolbarProps) {
  const { drawingMode, canUndo, canRedo, toggleDrawingMode, undo, redo } =
    useToolbar();
  const strokeCount = useDrawingStore((s) => s.strokeCount);
  const user = useAuthStore((s) => s.user);
  const placingPin = usePinStore((s) => s.placingPin);
  const setPlacingPin = usePinStore((s) => s.setPlacingPin);

  /** Gate an action behind auth */
  const requireAuth = (action: () => void) => {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    action();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute left-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5 rounded-xl border bg-background/90 p-1.5 shadow-lg backdrop-blur-sm">
        {/* Toggle drawing mode */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={drawingMode ? 'default' : 'ghost'}
              size="icon"
              onClick={() => requireAuth(toggleDrawingMode)}
            >
              {drawingMode ? <Pencil className="h-4 w-4" /> : <MousePointer2 className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {drawingMode ? '切换到导航模式' : '切换到绘画模式'}
          </TooltipContent>
        </Tooltip>

        {/* Pin placement */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={placingPin ? 'default' : 'ghost'}
              size="icon"
              onClick={() => requireAuth(() => setPlacingPin(!placingPin))}
            >
              <MapPin className={cn('h-4 w-4', placingPin && 'text-primary-foreground')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {placingPin ? '取消放置图钉' : '放置留言图钉'}
          </TooltipContent>
        </Tooltip>

        <div className="mx-auto h-px w-5 bg-border" />

        {/* Brush panel */}
        <BrushPanel />

        {/* Color picker */}
        <ColorPicker />

        <div className="mx-auto h-px w-5 bg-border" />

        {/* Undo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">撤销 (Ctrl+Z)</TooltipContent>
        </Tooltip>

        {/* Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">重做 (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <div className="mx-auto h-px w-5 bg-border" />

        {/* Ink bar */}
        <InkBar />

        {/* Stroke count */}
        {strokeCount > 0 && (
          <>
            <div className="mx-auto h-px w-5 bg-border" />
            <div className="px-1 text-center text-[10px] tabular-nums text-muted-foreground">
              {strokeCount}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
