import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageDocumentSync } from '@/components/shared/LanguageDocumentSync';

export const metadata: Metadata = {
  metadataBase: new URL('https://map.wisebamboo.fun'),
  title: {
    default: 'DrawMaps — Draw Together on the Real-World Map',
    template: '%s | DrawMaps',
  },
  description: 'DrawMaps is a collaborative map canvas for geographic drawing and location-based messages on Web and iOS.',
  applicationName: 'DrawMaps',
  keywords: ['collaborative map drawing', 'shared map canvas', 'location-based art', 'map graffiti', 'interactive map drawing'],
  authors: [{ name: 'Shenzhen Yuzhu Intelligent Co., Ltd.' }],
  creator: 'Shenzhen Yuzhu Intelligent Co., Ltd.',
  publisher: 'Shenzhen Yuzhu Intelligent Co., Ltd.',
  icons: { icon: '/logo.png' },
  alternates: {
    canonical: '/',
    languages: {
      en: '/en',
      'zh-CN': '/zh-cn',
      ja: '/ja',
      'x-default': '/en',
    },
  },
  openGraph: {
    title: 'DrawMaps — Draw Together on the Real-World Map',
    description: 'Draw at real coordinates, leave location-based messages, and create one shared global canvas.',
    url: 'https://map.wisebamboo.fun',
    siteName: 'DrawMaps',
    images: [
      {
        url: '/hero-illustration.png',
        width: 600,
        height: 600,
        alt: 'DrawMaps collaborative map canvas',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DrawMaps — Draw Together on the Real-World Map',
    description: 'Draw at real coordinates, leave location-based messages, and create one shared global canvas.',
    images: ['/hero-illustration.png'],
  },
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { other: { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
      : {}),
  },
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
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Shenzhen Yuzhu Intelligent Co., Ltd.',
      alternateName: '深圳市玉竹智能有限公司',
      url: 'https://map.wisebamboo.fun',
      logo: 'https://map.wisebamboo.fun/logo.png',
      email: 'wenjian@wisebamboo.fun',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'DrawMaps',
      url: 'https://map.wisebamboo.fun',
      inLanguage: ['en', 'zh-CN', 'ja'],
      publisher: { '@type': 'Organization', name: 'Shenzhen Yuzhu Intelligent Co., Ltd.' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'DrawMaps',
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'Web, iOS',
      url: 'https://map.wisebamboo.fun',
      description: 'A collaborative map canvas for geographic drawing and location-based messages.',
      featureList: [
        'Coordinate-based collaborative drawing',
        'Location-based pin messages',
        'Web and iOS account synchronization',
        'Reporting and user blocking',
      ],
    },
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <LanguageDocumentSync />
        {children}
      </body>
    </html>
  );
}
