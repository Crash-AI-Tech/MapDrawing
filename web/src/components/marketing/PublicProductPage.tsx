import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { WavySeparator } from '@/components/marketing/WavySeparator';
import {
  PUBLIC_CONTENT,
  PUBLIC_LOCALES,
  SITE_URL,
  publicPath,
  type PublicLocale,
  type PublicSlug,
} from '@/lib/public-content';

const FONT = { fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif' };

export function PublicProductPage({ locale, slug }: { locale: PublicLocale; slug: 'overview' | PublicSlug }) {
  const copy = PUBLIC_CONTENT[locale];
  const page = copy.pages[slug];
  const canonicalPath = publicPath(locale, slug);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': slug === 'faq' ? 'FAQPage' : 'WebPage',
      name: page.title,
      description: page.description,
      url: `${SITE_URL}${canonicalPath}`,
      inLanguage: copy.languageTag,
      isPartOf: { '@type': 'WebSite', name: 'DrawMaps', url: SITE_URL },
      ...(slug === 'faq' && page.faqs
        ? {
            mainEntity: page.faqs.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          }
        : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'DrawMaps', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: page.title, item: `${SITE_URL}${canonicalPath}` },
      ],
    },
  ];

  return (
    <div lang={copy.languageTag} className="min-h-screen overflow-hidden bg-amber-300 text-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="fixed left-1/2 top-4 z-50 flex w-[90%] max-w-6xl -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-white/30 bg-white/60 px-5 py-3 shadow-xl backdrop-blur-2xl sm:w-[85%] sm:px-7" style={FONT}>
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
          <Image src="/logo.png" alt="DrawMaps logo" width={32} height={32} className="rounded-lg" priority />
          <span>Map</span>
        </Link>
        <nav aria-label={copy.resources} className="hidden items-center gap-1 xl:flex">
          {(Object.keys(copy.nav) as Array<'overview' | PublicSlug>).map((item) => (
            <Link key={item} href={publicPath(locale, item)} className={`rounded-full px-3 py-2 text-sm font-semibold transition ${item === slug ? 'bg-violet-100 text-violet-700' : 'text-gray-700 hover:bg-white/70 hover:text-violet-700'}`}>
              {copy.nav[item]}
            </Link>
          ))}
        </nav>
        <Link href="/canvas" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800">
          {copy.openCanvas}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      <main>
        <section className="relative bg-amber-300 px-6 pb-32 pt-36 md:px-10 lg:px-16 lg:pb-40 lg:pt-44">
          <div className="mx-auto max-w-5xl text-center">
            <p className="mb-5 inline-flex rounded-full bg-amber-500/30 px-5 py-2 text-sm font-bold uppercase tracking-[0.16em] text-amber-950/70" style={FONT}>{page.eyebrow}</p>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-6xl lg:text-7xl" style={FONT}>{page.title}</h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-gray-800 sm:text-xl">{page.summary}</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/canvas" className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-4 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-800">
                {copy.openCanvas}<ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              {slug !== 'how-it-works' && (
                <Link href={publicPath(locale, 'how-it-works')} className="rounded-full border-2 border-amber-500/30 bg-white/45 px-7 py-4 font-bold text-gray-800 transition hover:bg-white/70">
                  {copy.nav['how-it-works']}
                </Link>
              )}
            </div>
          </div>
          <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-sky-400">
            <WavySeparator />
          </div>
        </section>

        <section className="relative bg-sky-400 px-6 pb-32 pt-20 md:px-10 lg:px-16 lg:pb-40 lg:pt-28">
          <div className="mx-auto max-w-6xl">
            {page.sections.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                {page.sections.map((section, index) => (
                  <section key={section.heading} className="rounded-[2rem] bg-white p-7 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl sm:p-8">
                    <span className="text-4xl font-bold text-sky-200" style={FONT}>{String(index + 1).padStart(2, '0')}</span>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900" style={FONT}>{section.heading}</h2>
                    <p className="mt-3 leading-7 text-gray-600">{section.body}</p>
                    {section.bullets && (
                      <ul className="mt-5 space-y-3 text-sm leading-6 text-gray-700">
                        {section.bullets.map((item) => <li key={item} className="rounded-2xl bg-sky-50 px-4 py-3">{item}</li>)}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}

            {page.faqs && (
              <div className="mx-auto max-w-4xl space-y-5">
                {page.faqs.map((item) => (
                  <details key={item.question} className="group rounded-[2rem] bg-white px-7 py-6 shadow-lg open:shadow-xl">
                    <summary className="cursor-pointer text-lg font-bold text-gray-900 marker:text-violet-500" style={FONT}>{item.question}</summary>
                    <p className="mt-4 max-w-3xl leading-7 text-gray-600">{item.answer}</p>
                  </details>
                ))}
              </div>
            )}

            <nav aria-label="Languages" className="mt-12 flex flex-wrap justify-center gap-2">
              {PUBLIC_LOCALES.map((candidate) => (
                <Link key={candidate} href={publicPath(candidate, slug)} hrefLang={PUBLIC_CONTENT[candidate].languageTag} className={`rounded-full px-5 py-2.5 text-sm font-bold shadow-sm transition ${candidate === locale ? 'bg-gray-900 text-white' : 'bg-white/75 text-gray-700 hover:bg-white'}`}>
                  {PUBLIC_CONTENT[candidate].languageName}
                </Link>
              ))}
            </nav>
          </div>
          <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-violet-500">
            <WavySeparator className="scale-x-[-1]" />
          </div>
        </section>

        <section className="bg-violet-500 px-6 py-24 text-center md:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-4xl font-bold text-white md:text-5xl" style={FONT}>DrawMaps</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/85">{copy.operatedBy}</p>
            <Link href="/canvas" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-violet-700 shadow-lg transition hover:bg-violet-50">
              {copy.openCanvas}<ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 px-6 py-8 text-gray-400">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="text-sm">© {new Date().getFullYear()} DrawMaps</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link href="/support" className="hover:text-white">Support</Link>
            <Link href={`/legal/privacy?lang=${locale === 'zh-cn' ? 'zh' : locale}`} className="hover:text-white">Privacy</Link>
            <Link href={`/legal/terms?lang=${locale === 'zh-cn' ? 'zh' : locale}`} className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
