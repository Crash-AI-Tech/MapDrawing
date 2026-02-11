import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Map — Global Collaborative Map Drawing',
  description: 'Collaboratively draw on a real-world map in real-time. Features multiple brushes, high-concurrency sync, and digital heritage persistence.',
  keywords: ['map collaboration', 'real-time drawing', 'global canvas', 'digital graffiti', 'collaborative art', 'interactive map'],
  authors: [{ name: 'Map Team' }],
  icons: { icon: '/logo.png' },
  openGraph: {
    title: 'Map — Global Collaborative Map Drawing',
    description: 'Sketch on the streets of the world. Connect with others through art on a shared global canvas.',
    url: 'https://map.example.com',
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
        {children}
      </body>
    </html>
  );
}
