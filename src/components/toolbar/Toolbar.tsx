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
  Hand,
  Pencil,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ToolMode = 'hand' | 'draw' | 'pin';

const ACTIVE_BTN = 'bg-violet-600 text-white hover:bg-violet-500 hover:text-white shadow-inner';

interface ToolbarProps {
  /** Called when a guest tries to draw — opens AuthDialog */
  onAuthRequired?: () => void;
}

/**
 * Toolbar — main floating toolbar on the left side.
 */
export default function Toolbar({ onAuthRequired }: ToolbarProps) {
  const { drawingMode, canUndo, canRedo, undo, redo } = useToolbar();
  const setDrawingMode = useDrawingStore((s) => s.setDrawingMode);
  const strokeCount = useDrawingStore((s) => s.strokeCount);
  const user = useAuthStore((s) => s.user);
  const placingPin = usePinStore((s) => s.placingPin);
  const setPlacingPin = usePinStore((s) => s.setPlacingPin);

  // Derive current tool mode
  const currentMode: ToolMode = placingPin ? 'pin' : drawingMode ? 'draw' : 'hand';

  /** Gate an action behind auth */
  const requireAuth = (action: () => void) => {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    action();
  };

  /** Switch to a tool mode — the three modes are mutually exclusive */
  const switchMode = (mode: ToolMode) => {
    if (mode === 'hand') {
      setDrawingMode(false);
      setPlacingPin(false);
    } else if (mode === 'draw') {
      requireAuth(() => {
        setDrawingMode(true);
        setPlacingPin(false);
      });
    } else if (mode === 'pin') {
      requireAuth(() => {
        setDrawingMode(false);
        setPlacingPin(true);
      });
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute left-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5 rounded-xl border border-gray-200/60 bg-gray-100/80 p-1.5 shadow-lg backdrop-blur-md">
        {/* Hand (navigate) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(currentMode === 'hand' && ACTIVE_BTN)}
              onClick={() => switchMode('hand')}
            >
              <Hand className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">导航模式</TooltipContent>
        </Tooltip>

        {/* Draw */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(currentMode === 'draw' && ACTIVE_BTN)}
              onClick={() => switchMode('draw')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">绘画模式</TooltipContent>
        </Tooltip>

        {/* Pin */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(currentMode === 'pin' && ACTIVE_BTN)}
              onClick={() => switchMode('pin')}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">放置留言图钉</TooltipContent>
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
