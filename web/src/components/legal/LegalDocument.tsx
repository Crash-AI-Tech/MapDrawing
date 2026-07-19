'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { useI18n, type Lang } from '@/lib/i18n';
import { LEGAL_COPY } from '@/lib/legal-content';

export function LegalDocument({ kind, initialLang }: { kind: 'terms' | 'privacy'; initialLang?: Lang }) {
  const { lang, setLang } = useI18n();

  useEffect(() => {
    if (initialLang) setLang(initialLang);
  }, [initialLang, setLang]);

  const copy = LEGAL_COPY[kind][lang];

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white text-gray-800">
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-violet-700"><ArrowLeft className="h-4 w-4" />DrawMaps</Link>
          <LanguageSelector compact />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="mb-10 rounded-[2rem] border border-white/80 bg-white/70 p-7 shadow-xl shadow-violet-100/50 backdrop-blur-2xl sm:p-10">
          <h1 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">{copy.title}</h1>
          <p className="mt-3 text-sm font-medium text-violet-700">{copy.updated}</p>
          <p className="mt-6 text-base leading-8 text-gray-600">{copy.summary}</p>
        </div>
        <article className="space-y-10 rounded-[2rem] border border-gray-100 bg-white p-7 shadow-sm sm:p-10">
          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold text-gray-950">{section.title}</h2>
              <div className="mt-3 space-y-3">{section.paragraphs.map((paragraph) => <p key={paragraph} className="leading-7 text-gray-600">{paragraph}</p>)}</div>
            </section>
          ))}
        </article>
        <div className="mt-8 flex flex-wrap gap-5 text-sm text-violet-700">
          <Link href={`/support?lang=${lang}`} className="underline underline-offset-4">Support</Link>
          <Link href={`/legal/${kind === 'terms' ? 'privacy' : 'terms'}?lang=${lang}`} className="underline underline-offset-4">{kind === 'terms' ? LEGAL_COPY.privacy[lang].title : LEGAL_COPY.terms[lang].title}</Link>
        </div>
      </main>
    </div>
  );
}
