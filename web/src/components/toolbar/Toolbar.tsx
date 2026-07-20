'use client';

import { useToolbar } from '@/hooks/useToolbar';
import { useDrawingStore } from '@/stores/drawingStore';
import { useAuthStore } from '@/stores/authStore';
import { usePinStore } from '@/stores/pinStore';
import { useUIStore } from '@/stores/uiStore';
import { MIN_PIN_ZOOM, MIN_DRAW_ZOOM, BRUSH_IDS } from '@/constants';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import ColorPicker from './ColorPicker';
import InkBar from './InkBar';
import {
  Undo2,
  Redo2,
  Hand,
  Pencil,
  Eraser,
  MapPin,
  Eye,
  EyeOff,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useI18n } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';

type ToolMode = 'hand' | 'draw' | 'pin';

const ACTIVE_BTN = 'bg-violet-600 text-white hover:bg-violet-500 hover:text-white shadow-inner';
const ERASER_BTN = 'bg-orange-500 text-white hover:bg-orange-400 hover:text-white shadow-inner';

interface ToolbarProps {
  /** Called when a guest tries to draw — opens AuthDialog */
  onAuthRequired?: () => void;
}

/**
 * Toolbar — main floating toolbar on the left side.
 */
export default function Toolbar({ onAuthRequired }: ToolbarProps) {
  const { t } = useI18n();
  const { drawingMode, canUndo, canRedo, undo, redo } = useToolbar();
  const setDrawingMode = useDrawingStore((s) => s.setDrawingMode);
  const activeBrushId = useDrawingStore((s) => s.activeBrushId);
  const setActiveBrush = useDrawingStore((s) => s.setActiveBrush);
  const strokeCount = useDrawingStore((s) => s.strokeCount);
  const strokesTransparent = useDrawingStore((s) => s.strokesTransparent);
  const setStrokesTransparent = useDrawingStore((s) => s.setStrokesTransparent);
  const user = useAuthStore((s) => s.user);
  const placingPin = usePinStore((s) => s.placingPin);
  const setPlacingPin = usePinStore((s) => s.setPlacingPin);
  const currentZoom = useUIStore((s) => s.currentZoom);
  const [zoomTooltip, setZoomTooltip] = useState<string | null>(null);
  const zoomTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive current tool mode
  const currentMode: ToolMode = placingPin ? 'pin' : drawingMode ? 'draw' : 'hand';
  const isEraser = activeBrushId === BRUSH_IDS.ERASER;

  /** Show a temporary tooltip */
  const flashTooltip = (msg: string) => {
    if (zoomTooltipTimerRef.current) clearTimeout(zoomTooltipTimerRef.current);
    setZoomTooltip(msg);
    zoomTooltipTimerRef.current = setTimeout(() => setZoomTooltip(null), 3000);
  };

  useEffect(() => () => {
    if (zoomTooltipTimerRef.current) clearTimeout(zoomTooltipTimerRef.current);
  }, []);

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
          flashTooltip(t('zoomDrawHint', { zoom: MIN_DRAW_ZOOM, current: Math.floor(currentZoom) }));
          return;
        }
        // If already in draw mode, toggle pencil ↔ eraser
        if (currentMode === 'draw') {
          setActiveBrush(
            activeBrushId === BRUSH_IDS.ERASER ? BRUSH_IDS.PENCIL : BRUSH_IDS.ERASER
          );
          return;
        }
        setDrawingMode(true);
        setPlacingPin(false);
      });
    } else if (mode === 'pin') {
      requireAuth(() => {
        if (currentZoom < MIN_PIN_ZOOM) {
          flashTooltip(t('zoomPinHint', { zoom: MIN_PIN_ZOOM, current: Math.floor(currentZoom) }));
          return;
        }
        setDrawingMode(false);
        setPlacingPin(true);
      });
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2">
        {/* Zoom tooltip */}
        {zoomTooltip && (
          <div className="absolute bottom-full z-50 mb-2 whitespace-nowrap rounded-full bg-yellow-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
            {zoomTooltip}
          </div>
        )}

        {/* Ink is a separate floating status above the dock on both platforms. */}
        <InkBar />

        <div className="liquid-glass relative flex h-12 w-[94vw] max-w-[44rem] items-center justify-center gap-2 rounded-full px-3 md:gap-4">
        {/* Hand (navigate) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-9 w-9 rounded-full', currentMode === 'hand' && ACTIVE_BTN)}
              onClick={() => switchMode('hand')}
              aria-label={t('toolNavigation')}
            >
              <Hand className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toolNavigation')}</TooltipContent>
        </Tooltip>

        {/* Pin */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-9 w-9 rounded-full', currentMode === 'pin' && ACTIVE_BTN)}
              onClick={() => switchMode('pin')}
              aria-label={t('toolPin')}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toolPin')}</TooltipContent>
        </Tooltip>

        {/* Current drawing tool — enters draw mode, then toggles pencil/eraser */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9 rounded-full',
                isEraser ? ERASER_BTN : currentMode === 'draw' && ACTIVE_BTN,
              )}
              onClick={() => switchMode('draw')}
              aria-label={isEraser ? t('toolEraserToggle') : t('toolPencilToggle')}
            >
              {isEraser ? <Eraser className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isEraser ? t('toolEraserToggle') : t('toolPencilToggle')}
          </TooltipContent>
        </Tooltip>

        <div className="h-5 w-px bg-border" />

        {/* Color and brush settings — visible on both, disabled if guest */}
        <div className={cn('flex items-center', !user && 'opacity-50 pointer-events-none grayscale')}>
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
              aria-label={t('toolUndo')}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toolUndo')}</TooltipContent>
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
              aria-label={t('toolRedo')}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toolRedo')}</TooltipContent>
        </Tooltip>

        {/* === Desktop-only secondary tools === */}
        <div className="hidden md:flex md:items-center md:gap-1.5">
          {/* Transparency toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-9 w-9 rounded-full', strokesTransparent && ACTIVE_BTN)}
                onClick={() => setStrokesTransparent(!strokesTransparent)}
                aria-label={strokesTransparent ? t('toolTransparencyOff') : t('toolTransparencyOn')}
              >
                {strokesTransparent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {strokesTransparent ? t('toolTransparencyOff') : t('toolTransparencyOn')}
            </TooltipContent>
          </Tooltip>

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

        {/* === Mobile-only overflow menu === */}
        <div className="flex items-center md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t('toolMore')}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={8} className="liquid-glass-panel w-48">
              <DropdownMenuItem onClick={() => setStrokesTransparent(!strokesTransparent)}>
                {strokesTransparent ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {strokesTransparent ? t('toolTransparencyOff') : t('toolTransparencyOn')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
