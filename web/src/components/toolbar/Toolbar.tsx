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
import BrushPanel from './BrushPanel';
import ColorPicker from './ColorPicker';
import InkBar from './InkBar';
import ExportMenu from './ExportMenu';
import {
  Undo2,
  Redo2,
  Hand,
  Pencil,
  MapPin,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useI18n } from '@/lib/i18n';
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
  const syncState = useUIStore((s) => s.syncState);
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
      {/*
        Desktop: top-center horizontal bar
        Mobile:  bottom-center compact bar with overflow menu
      */}
      <div className="absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-gray-200/60 bg-gray-100/80 p-1.5 shadow-lg backdrop-blur-md bottom-4 md:bottom-auto md:top-4 md:gap-1.5">
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
          <TooltipContent>{t('toolNavigation')}</TooltipContent>
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
          <TooltipContent>{t('toolDraw')}</TooltipContent>
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
          <TooltipContent>{t('toolPin')}</TooltipContent>
        </Tooltip>

        {/* Zoom tooltip */}
        {zoomTooltip && (
          <div className="absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-yellow-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm bottom-full mb-2 md:bottom-auto md:top-full md:mt-2 md:mb-0">
            {zoomTooltip}
          </div>
        )}

        <div className="h-5 w-px bg-border" />

        {/* Brush & Color — visible on both, disabled if guest */}
        <div className={cn('flex items-center gap-1', !user && 'opacity-50 pointer-events-none grayscale')}>
          <BrushPanel />
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
              >
                {strokesTransparent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {strokesTransparent ? t('toolTransparencyOff') : t('toolTransparencyOn')}
            </TooltipContent>
          </Tooltip>

          {/* Export / Share */}
          <ExportMenu />

          <div className="h-5 w-px bg-border" />

          {/* Ink bar */}
          <InkBar />

          {/* Sync status indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-5 w-5 items-center justify-center">
                {syncState === 'connected' && (
                  <Wifi className="h-3 w-3 text-green-500" />
                )}
                {syncState === 'connecting' && (
                  <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                )}
                {syncState === 'disconnected' && (
                  <WifiOff className="h-3 w-3 text-gray-400" />
                )}
                {syncState === 'error' && (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {syncState === 'connected' && t('syncConnected')}
              {syncState === 'connecting' && t('syncConnecting')}
              {syncState === 'disconnected' && t('syncDisconnected')}
              {syncState === 'error' && t('syncError')}
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
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-48">
              <DropdownMenuItem onClick={() => setStrokesTransparent(!strokesTransparent)}>
                {strokesTransparent ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {strokesTransparent ? t('toolTransparencyOff') : t('toolTransparencyOn')}
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {syncState === 'connected' && <Wifi className="h-3 w-3 text-green-500" />}
                  {syncState === 'connecting' && <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />}
                  {(syncState === 'disconnected' || syncState === 'error') && <WifiOff className="h-3 w-3 text-gray-400" />}
                  {syncState === 'connected' ? t('syncConnected') : syncState === 'connecting' ? t('syncConnecting') : t('syncOffline')}
                </span>
                {strokeCount > 0 && (
                  <span className="text-[10px] tabular-nums text-muted-foreground">{strokeCount}</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
