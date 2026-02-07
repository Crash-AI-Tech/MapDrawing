'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import LoadingOverlay from '@/components/shared/LoadingOverlay';
import Toolbar from '@/components/toolbar/Toolbar';
import UserMenu from '@/components/auth/UserMenu';
import AuthDialog from '@/components/auth/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

// MapCanvas uses MapLibre GL which requires window — dynamic import with no SSR
const MapCanvas = dynamic(
  () => import('@/components/canvas/MapCanvas'),
  {
    ssr: false,
    loading: () => <LoadingOverlay visible message="加载地图引擎..." />,
  }
);

/**
 * Canvas page — main drawing interface.
 * Guests can view the map; auth dialog pops up when they try to draw.
 */
export default function CanvasPage() {
  const { isLoading } = useAuth();
  const user = useAuthStore((s) => s.user);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  return (
    <ErrorBoundary>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Map + Canvas */}
        <MapCanvas />

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
