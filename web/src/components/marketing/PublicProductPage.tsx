import Image from 'next/image';
import Link from 'next/link';
import {
  PUBLIC_CONTENT,
  PUBLIC_LOCALES,
  SITE_URL,
  publicPath,
  type PublicLocale,
  type PublicSlug,
} from '@/lib/public-content';

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
    <div lang={copy.languageTag} className="min-h-screen bg-[#f7f7fb] text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <Image src="/logo.png" alt="DrawMaps logo" width={34} height={34} className="rounded-xl" />
            <span>DrawMaps</span>
          </Link>
          <nav aria-label={copy.resources} className="hidden items-center gap-1 lg:flex">
            {(Object.keys(copy.nav) as Array<'overview' | PublicSlug>).map((item) => (
              <Link key={item} href={publicPath(locale, item)} className={`rounded-full px-3 py-2 text-sm font-medium transition ${item === slug ? 'bg-violet-100 text-violet-700' : 'text-slate-600 hover:bg-white hover:text-violet-700'}`}>
                {copy.nav[item]}
              </Link>
            ))}
          </nav>
          <Link href="/canvas" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700">
            {copy.openCanvas}
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-violet-100 bg-gradient-to-br from-amber-200 via-rose-100 to-violet-200 px-5 py-20 sm:py-28">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/40 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-5xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-violet-700">{page.eyebrow}</p>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">{page.title}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-700 sm:text-xl">{page.summary}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/canvas" className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700">{copy.openCanvas}</Link>
              {slug !== 'how-it-works' && <Link href={publicPath(locale, 'how-it-works')} className="rounded-full border border-white/80 bg-white/60 px-6 py-3 font-semibold text-slate-800 backdrop-blur-xl transition hover:bg-white">{copy.nav['how-it-works']}</Link>}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
          {page.sections.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              {page.sections.map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-white bg-white/80 p-7 shadow-sm">
                  <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{section.heading}</h2>
                  <p className="mt-3 leading-7 text-slate-600">{section.body}</p>
                  {section.bullets && <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">{section.bullets.map((item) => <li key={item} className="flex gap-3"><span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />{item}</li>)}</ul>}
                </section>
              ))}
            </div>
          )}

          {page.faqs && (
            <div className="space-y-4">
              {page.faqs.map((item) => (
                <details key={item.question} className="group rounded-3xl border border-white bg-white/85 px-6 py-5 shadow-sm open:ring-2 open:ring-violet-100">
                  <summary className="cursor-pointer text-lg font-bold marker:text-violet-500">{item.question}</summary>
                  <p className="mt-4 max-w-3xl leading-7 text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          )}

          <nav aria-label="Languages" className="mt-14 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-8">
            {PUBLIC_LOCALES.map((candidate) => (
              <Link key={candidate} href={publicPath(candidate, slug)} hrefLang={PUBLIC_CONTENT[candidate].languageTag} className={`rounded-full px-4 py-2 text-sm font-medium ${candidate === locale ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600 hover:text-violet-700'}`}>
                {PUBLIC_CONTENT[candidate].languageName}
              </Link>
            ))}
          </nav>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-slate-950 px-5 py-10 text-slate-300">
        <div className="mx-auto flex max-w-5xl flex-col justify-between gap-6 md:flex-row">
          <div><p className="font-bold text-white">DrawMaps</p><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{copy.operatedBy}</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/support" className="hover:text-white">Support</Link>
            <Link href={`/legal/privacy?lang=${locale === 'zh-cn' ? 'zh' : locale}`} className="hover:text-white">Privacy</Link>
            <Link href={`/legal/terms?lang=${locale === 'zh-cn' ? 'zh' : locale}`} className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
