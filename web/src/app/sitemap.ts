import type { MetadataRoute } from 'next';
import { PUBLIC_LOCALES, PUBLIC_SLUGS, SITE_URL, publicPath } from '@/lib/public-content';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-07-20T00:00:00.000Z');
  const localized = PUBLIC_LOCALES.flatMap((locale) => {
    const pages = ['overview', ...PUBLIC_SLUGS] as const;
    return pages.map((slug) => ({
      url: `${SITE_URL}${publicPath(locale, slug)}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: slug === 'overview' ? 0.85 : 0.7,
      alternates: {
        languages: Object.fromEntries(PUBLIC_LOCALES.map((candidate) => [candidate === 'zh-cn' ? 'zh-CN' : candidate, `${SITE_URL}${publicPath(candidate, slug)}`])),
      },
    }));
  });

  return [
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/support`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/legal/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/legal/terms`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    ...localized,
  ];
}
