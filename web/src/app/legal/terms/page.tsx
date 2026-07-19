import type { Lang } from '@/lib/i18n';
import { LegalDocument } from '@/components/legal/LegalDocument';

function parseLang(value: string | string[] | undefined): Lang | undefined {
  return value === 'zh' || value === 'en' || value === 'ja' ? value : undefined;
}

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const params = await searchParams;
  return <LegalDocument kind="terms" initialLang={parseLang(params.lang)} />;
}
