import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/public-content';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/en/', '/zh-cn/', '/ja/', '/support', '/legal/'],
      disallow: ['/api/', '/canvas', '/share/', '/login', '/register', '/reset-password'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
