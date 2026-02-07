export const runtime = 'edge';

/**
 * Canvas layout — no auth guard; guests can view the map and strokes.
 * Auth is only required when trying to draw (handled client-side).
 */
export default async function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
