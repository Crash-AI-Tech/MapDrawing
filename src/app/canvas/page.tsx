'use client';

import { useState, lazy, Suspense, useEffect } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import LoadingOverlay from '@/components/shared/LoadingOverlay';
import Toolbar from '@/components/toolbar/Toolbar';
import UserMenu from '@/components/auth/UserMenu';
import AuthDialog from '@/components/auth/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

// MapCanvas uses MapLibre GL which requires window — lazy import with client-only guard
const LazyMapCanvas = lazy(() => import('@/components/canvas/MapCanvas'));

/**
 * Canvas page — main drawing interface.
 * Guests can view the map; auth dialog pops up when they try to draw.
 */
export default function CanvasPage() {
  const { isLoading } = useAuth();
  const user = useAuthStore((s) => s.user);
  const syncState = useUIStore((s) => s.syncState);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Client-only guard: MapLibre GL needs window/document
  useEffect(() => setMounted(true), []);

  return (
    <ErrorBoundary>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Map + Canvas */}
        {mounted ? (
          <Suspense fallback={<LoadingOverlay visible message="加载地图引擎..." />}>
            <LazyMapCanvas />
          </Suspense>
        ) : (
          <LoadingOverlay visible message="加载地图引擎..." />
        )}

        {/* Toolbar (left) — passes auth gate callback */}
        <Toolbar onAuthRequired={() => setShowAuthDialog(true)} />

        {/* User menu + sync status (top-right) */}
        <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
          {/* Sync status dot */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-gray-200/60 bg-gray-100/80 px-2.5 py-1 text-[11px] backdrop-blur-md"
            title={syncState === 'connected' ? '已连接' : syncState === 'connecting' ? '连接中…' : '离线'}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                syncState === 'connected'
                  ? 'bg-green-500'
                  : syncState === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            <span className="text-muted-foreground">
              {syncState === 'connected' ? '在线' : syncState === 'connecting' ? '连接中' : '离线'}
            </span>
          </div>
          <UserMenu onLoginClick={() => setShowAuthDialog(true)} />
        </div>

        {/* Auth dialog for guests */}
        <AuthDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
        />
      </div>
    </ErrorBoundary>
  );
}
