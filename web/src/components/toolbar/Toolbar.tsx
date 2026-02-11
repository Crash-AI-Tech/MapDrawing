'use client';

import { useToolbar } from '@/hooks/useToolbar';
import { useDrawingStore } from '@/stores/drawingStore';
import { useAuthStore } from '@/stores/authStore';
import { usePinStore } from '@/stores/pinStore';
import { useUIStore } from '@/stores/uiStore';
import { MIN_PIN_ZOOM, MIN_DRAW_ZOOM } from '@/constants';
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
import { useState } from 'react';

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
  const currentZoom = useUIStore((s) => s.currentZoom);
  const [zoomTooltip, setZoomTooltip] = useState<string | null>(null);

  // Derive current tool mode
  const currentMode: ToolMode = placingPin ? 'pin' : drawingMode ? 'draw' : 'hand';

  /** Show a temporary tooltip */
  const flashTooltip = (msg: string) => {
    setZoomTooltip(msg);
    setTimeout(() => setZoomTooltip(null), 3000);
  };

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
        if (currentZoom < MIN_DRAW_ZOOM) {
          flashTooltip(`请放大到 ${MIN_DRAW_ZOOM} 级以上才能绘画（当前 ${Math.floor(currentZoom)} 级）`);
          return;
        }
        setDrawingMode(true);
        setPlacingPin(false);
      });
    } else if (mode === 'pin') {
      requireAuth(() => {
        if (currentZoom < MIN_PIN_ZOOM) {
          flashTooltip(`请放大到 ${MIN_PIN_ZOOM} 级以上才能放置图钉（当前 ${Math.floor(currentZoom)} 级）`);
          return;
        }
        setDrawingMode(false);
        setPlacingPin(true);
      });
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-gray-200/60 bg-gray-100/80 p-1.5 shadow-lg backdrop-blur-md">
        {/* Hand (navigate) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-9 w-9 rounded-full', currentMode === 'hand' && ACTIVE_BTN)}
              onClick={() => switchMode('hand')}
            >
              <Hand className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Navigation</TooltipContent>
        </Tooltip>

        {/* Draw */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-9 w-9 rounded-full', currentMode === 'draw' && ACTIVE_BTN)}
              onClick={() => switchMode('draw')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Draw</TooltipContent>
        </Tooltip>

        {/* Pin */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-9 w-9 rounded-full', currentMode === 'pin' && ACTIVE_BTN)}
              onClick={() => switchMode('pin')}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Pin</TooltipContent>
        </Tooltip>

        {/* Zoom tooltip */}
        {zoomTooltip && (
          <div className="absolute left-1/2 top-full mt-2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-yellow-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
            {zoomTooltip}
          </div>
        )}

        <div className="h-5 w-px bg-border" />

        {/* Brush & Color — Disabled if guest */}
        <div className={cn('flex items-center gap-1.5', !user && 'opacity-50 pointer-events-none grayscale')}>
          {/* Brush panel */}
          <BrushPanel />

          {/* Color picker */}
          <ColorPicker />
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Undo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        {/* Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <div className="h-5 w-px bg-border" />

        {/* Ink bar */}
        <InkBar />

        {/* Stroke count */}
        {strokeCount > 0 && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="px-1 text-center text-[10px] tabular-nums text-muted-foreground">
              {strokeCount}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
