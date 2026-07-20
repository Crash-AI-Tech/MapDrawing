import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shared Map Canvas',
  description: 'The interactive DrawMaps canvas.',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Canvas layout — no auth guard; guests can view the map and strokes.
 * Auth is only required when trying to draw (handled client-side).
 * Note: @opennextjs/cloudflare runs all routes on Cloudflare Workers (edge) by default.
 */
export default async function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
