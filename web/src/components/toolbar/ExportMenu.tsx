'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Image as ImageIcon, Copy, Share2, Loader2, ChevronRight } from 'lucide-react';
import {
  captureCanvasBlob,
  downloadBlob,
  copyBlobToClipboard,
  generateExportFilename,
} from '@/lib/exportCanvas';
import { useI18n } from '@/lib/i18n';

/**
 * ExportMenu — dropdown to export the current map+drawing view.
 * Finds canvases via DOM IDs set by WebCanvasProvider and MapLibre.
 */
interface ExportMenuProps {
  variant?: 'icon' | 'profile';
}

export default function ExportMenu({ variant = 'icon' }: ExportMenuProps) {
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const capture = useCallback(async (): Promise<Blob | null> => {
    // MapLibre GL canvas
    const mapCanvas = document.querySelector<HTMLCanvasElement>('canvas.maplibregl-canvas');
    // Drawing composite canvas (set by WebCanvasProvider)
    const compositeCanvas = document.getElementById('niubi-composite-canvas') as HTMLCanvasElement | null;
    if (!mapCanvas || !compositeCanvas) {
      showToast(t('exportCanvasNotFound'), 'error');
      return null;
    }
    try {
      return await captureCanvasBlob(mapCanvas, compositeCanvas);
    } catch (e) {
      console.error('[ExportMenu] capture failed:', e);
      showToast(t('exportCaptureFailed'), 'error');
      return null;
    }
  }, [showToast, t]);

  const handleDownloadPNG = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await capture();
      if (blob) {
        downloadBlob(blob, generateExportFilename('png'));
        showToast(t('exportDownloaded'), 'success');
      }
    } finally {
      setExporting(false);
    }
  }, [capture, showToast, t]);

  const handleCopyClipboard = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await capture();
      if (blob) {
        await copyBlobToClipboard(blob);
        showToast(t('exportCopied'), 'success');
      }
    } catch (e) {
      console.error('[ExportMenu] clipboard failed:', e);
      showToast(t('exportCopyFailed'), 'error');
    } finally {
      setExporting(false);
    }
  }, [capture, showToast, t]);

  const handleShareLink = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await capture();
      if (!blob) return;

      const formData = new FormData();
      formData.append('file', blob, generateExportFilename('png'));

      const res = await fetch('/api/share', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const { url } = (await res.json()) as { url: string };
      await navigator.clipboard.writeText(url);
      showToast(t('exportShareCopied'), 'success');
    } catch (e) {
      console.error('[ExportMenu] share failed:', e);
      showToast(t('exportShareFailed'), 'error');
    } finally {
      setExporting(false);
    }
  }, [capture, showToast, t]);

  return (
    <>
      <DropdownMenu>
        {variant === 'profile' ? (
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-full px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-white/55">
              <span className="flex items-center gap-2.5">
                <Download className="h-3.5 w-3.5 text-violet-500" />
                {t('toolExport')}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            </button>
          </DropdownMenuTrigger>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  disabled={exporting}
                  aria-label={t('toolExport')}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('toolExport')}</TooltipContent>
          </Tooltip>
        )}
        <DropdownMenuContent
          align={variant === 'profile' ? 'end' : 'center'}
          side={variant === 'profile' ? 'left' : 'bottom'}
          sideOffset={8}
          className="liquid-glass-panel w-48"
        >
          <DropdownMenuItem onClick={handleDownloadPNG} disabled={exporting}>
            <ImageIcon className="mr-2 h-4 w-4" />
            {t('exportDownloadPNG')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyClipboard} disabled={exporting}>
            <Copy className="mr-2 h-4 w-4" />
            {t('exportCopyClipboard')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareLink} disabled={exporting}>
            <Share2 className="mr-2 h-4 w-4" />
            {t('exportShareLink')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Inline toast */}
      {toast && (
        <div
          className={`absolute left-1/2 top-full mt-2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm ${
            toast.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
