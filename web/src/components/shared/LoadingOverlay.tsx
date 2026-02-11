'use client';

import { cn } from '@/lib/utils/cn';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  className?: string;
}

export default function LoadingOverlay({
  visible,
  message = '加载中...',
  className,
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
