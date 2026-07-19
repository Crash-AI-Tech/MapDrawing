import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageDocumentSync } from '@/components/shared/LanguageDocumentSync';

export const metadata: Metadata = {
  metadataBase: new URL('https://map.wisebamboo.fun'),
  title: 'Map — Global Collaborative Map Drawing',
  description: 'Draw and leave messages on a shared real-world map with a global community.',
  keywords: ['map collaboration', 'global canvas', 'digital graffiti', 'collaborative art', 'interactive map'],
  authors: [{ name: 'Map Team' }],
  icons: { icon: '/logo.png' },
  openGraph: {
    title: 'Map — Global Collaborative Map Drawing',
    description: 'Sketch on the streets of the world. Connect with others through art on a shared global canvas.',
    url: 'https://map.wisebamboo.fun',
    siteName: 'Map',
    images: [
      {
        url: '/hero-illustration.png',
        width: 1200,
        height: 630,
        alt: 'Map Project Illustration',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Map — Global Collaborative Map Drawing',
    description: 'Sketch on the streets of the world. Connect with others through art on a shared global canvas.',
    images: ['/hero-illustration.png'],
  },
  other: {
    'geo.region': 'US',
    'geo.position': '37.7749;-122.4194',
    'ICBM': '37.7749, -122.4194',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFD700', // Amber color
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <LanguageDocumentSync />
        {children}
      </body>
    </html>
  );
}
