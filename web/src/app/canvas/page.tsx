'use client';

import { useState, lazy, Suspense, useEffect } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import LoadingOverlay from '@/components/shared/LoadingOverlay';
import Toolbar from '@/components/toolbar/Toolbar';
import UserMenu from '@/components/auth/UserMenu';
import AuthDialog from '@/components/auth/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';

// MapCanvas uses MapLibre GL which requires window — lazy import with client-only guard
const LazyMapCanvas = lazy(() => import('@/components/canvas/MapCanvas'));

/**
 * Canvas page — main drawing interface.
 * Guests can view the map; auth dialog pops up when they try to draw.
 */
export default function CanvasPage() {
  useAuth();
  const { t } = useI18n();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Client-only guard: MapLibre GL needs window/document
  useEffect(() => setMounted(true), []);

  return (
    <ErrorBoundary>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Map + Canvas */}
        {mounted ? (
          <Suspense fallback={<LoadingOverlay visible message={t('mapLoading')} />}>
            <LazyMapCanvas />
          </Suspense>
        ) : (
          <LoadingOverlay visible message={t('mapLoading')} />
        )}

        {/* Toolbar (left) — passes auth gate callback */}
        <Toolbar onAuthRequired={() => setShowAuthDialog(true)} />

        {/* User menu (top-right) */}
        <div className="absolute right-4 top-4 z-30">
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
