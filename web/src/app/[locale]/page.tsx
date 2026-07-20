import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PublicProductPage } from '@/components/marketing/PublicProductPage';
import { PUBLIC_LOCALES, getPublicMetadata, isPublicLocale } from '@/lib/public-content';

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isPublicLocale(locale) ? getPublicMetadata(locale, 'overview') : {};
}

export default async function LocaleOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <PublicProductPage locale={locale} slug="overview" />;
}
