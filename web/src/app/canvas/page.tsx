'use client';

import { useState, lazy, Suspense, useEffect } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import LoadingOverlay from '@/components/shared/LoadingOverlay';
import Toolbar from '@/components/toolbar/Toolbar';
import UserMenu from '@/components/auth/UserMenu';
import AuthDialog from '@/components/auth/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import CreationGuide from '@/components/canvas/CreationGuide';
import { trackEvent } from '@/lib/analytics';

// MapCanvas uses MapLibre GL which requires window — lazy import with client-only guard
const LazyMapCanvas = lazy(() => import('@/components/canvas/MapCanvas'));

/**
 * Canvas page — main drawing interface.
 * Guests can try drawing locally and choose to publish after signing in.
 */
export default function CanvasPage() {
  const { user, isLoading } = useAuth();
  const { t } = useI18n();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Client-only guard: MapLibre GL needs window/document
  useEffect(() => setMounted(true), []);
  useEffect(() => { if (!isLoading) trackEvent('canvas_open', user?.id ?? 'guest'); }, [isLoading, user?.id]);

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
        <CreationGuide onLogin={() => setShowAuthDialog(true)} />
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
