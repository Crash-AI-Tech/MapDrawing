import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PublicProductPage } from '@/components/marketing/PublicProductPage';
import { PUBLIC_LOCALES, PUBLIC_SLUGS, getPublicMetadata, isPublicLocale, isPublicSlug } from '@/lib/public-content';

export function generateStaticParams() {
  return PUBLIC_LOCALES.flatMap((locale) => PUBLIC_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return isPublicLocale(locale) && isPublicSlug(slug) ? getPublicMetadata(locale, slug) : {};
}

export default async function LocalizedProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale) || !isPublicSlug(slug)) notFound();
  return <PublicProductPage locale={locale} slug={slug} />;
}
