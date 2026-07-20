import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shared Canvas Preview',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function SharedCanvasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
