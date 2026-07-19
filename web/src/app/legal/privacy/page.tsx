import type { Lang } from '@/lib/i18n';
import { LegalDocument } from '@/components/legal/LegalDocument';

function parseLang(value: string | string[] | undefined): Lang | undefined {
  return value === 'zh' || value === 'en' || value === 'ja' ? value : undefined;
}

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const params = await searchParams;
  return <LegalDocument kind="privacy" initialLang={parseLang(params.lang)} />;
}
