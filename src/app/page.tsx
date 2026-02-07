'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Palette, Sparkles, ArrowRight, Droplets, Users, Globe } from 'lucide-react';

type Lang = 'zh' | 'en';

/* ================================
   i18n dictionary
   ================================ */
const t = {
  zh: {
    // nav
    navFeatures: '玩法',
    navSteps: '上手',
    navInk: '墨水',
    navVision: '愿景',
    langBtn: 'EN',
    // hero
    heroTag: '在真实地图上画画 🌍',
    heroTitle1: '在真实地图上，',
    heroTitle2: '和全世界一起涂鸦',
    heroDesc: '选一支画笔，在任何城市的街道上留下你的创作。放一枚图钉，写下一句只有路过的人才能看到的话。这里是属于每一个人的画布。',
    heroCta: '开始探索 →',
    // features
    featTitle: '玩法介绍',
    featSubtitle: '三种方式，让你在这颗星球上留下独一无二的印记。',
    feat1Title: '地图涂鸦',
    feat1Desc: '用铅笔、马克笔、喷枪、荧光笔在真实地图上画画。放大到街道级别，创作只属于这个街角的艺术作品。',
    feat2Title: '定位留言',
    feat2Desc: '在地图上放置彩色图钉，写下一句话。也许某天，有人路过那里会看到你的留言。每枚图钉消耗 50 墨水。',
    feat3Title: '共同创作',
    feat3Desc: '所有人的涂鸦都在同一张地图上。路过其他城市时，你会看到来自世界各地的创作。实时同步，每一笔都会立刻被其他人看到。',
    // steps
    stepsTitle: '如何开始',
    stepsSubtitle: '三步上手，简单到不能再简单。',
    step1Title: '打开地图',
    step1Desc: '点击「开始探索」按钮，进入地图画布。无需登录即可浏览全世界的创作。',
    step2Title: '选择工具',
    step2Desc: '从左侧工具栏选择手形（浏览）、画笔（涂鸦）或图钉（留言），然后放大到街道级别。',
    step3Title: '留下印记',
    step3Desc: '开始绘画或放置留言图钉。你的作品会实时同步，让全世界的人看到。',
    // ink
    inkTitle: '墨水系统',
    inkDesc: '每个人拥有 100 点墨水。绘画和放置图钉都会消耗墨水，但墨水会随时间恢复（每 8 秒 +1）。即使离线，墨水也会继续恢复。合理利用你的墨水，让每一笔都有意义！',
    inkDetail1: '🖨️ 铅笔、马克笔、喷枪、荧光笔 — 四种画笔，各有特色',
    inkDetail2: '⭐ 大小和透明度可调 — 54 种预设颜色 + 自定义',
    inkDetail3: '📌 图钉消耗 50 墨水 — 10 种预设色 + 自定义颜色',
    // vision
    visionTitle: '我们的愿景',
    visionDesc: '每个人都能在这颗星球上留下自己的印记。一笔一画，连接你我。',
    visionCta: '现在就去画 →',
    // footer
    footer: '在地图上画画',
  },
  en: {
    navFeatures: 'Features',
    navSteps: 'Guide',
    navInk: 'Ink',
    navVision: 'Vision',
    langBtn: '中文',
    heroTag: 'DRAW ON THE REAL WORLD 🌍',
    heroTitle1: 'Draw on the',
    heroTitle2: 'Real World Map',
    heroDesc: 'Pick a brush, leave your mark on any street in any city. Drop a pin, write a message only passers-by can read. This is everyone\'s canvas.',
    heroCta: 'Start Exploring →',
    featTitle: 'How It Works',
    featSubtitle: 'Three ways to leave your unique mark on planet Earth.',
    feat1Title: 'Map Graffiti',
    feat1Desc: 'Draw with pencils, markers, spray cans, and highlighters on real-world maps. Zoom into street level and create art on every corner.',
    feat2Title: 'Location Pins',
    feat2Desc: 'Plant a colorful pin on the map with a message. Someday, someone passing by might discover your words. Each pin costs 50 ink.',
    feat3Title: 'Co-creation',
    feat3Desc: 'Everyone draws on the same map. Travel to other cities and discover creations from around the world. Every stroke syncs in real-time.',
    stepsTitle: 'Getting Started',
    stepsSubtitle: 'Three steps — as easy as it gets.',
    step1Title: 'Open the Map',
    step1Desc: 'Click "Start Exploring" to enter the canvas. Browse creations worldwide — no login needed.',
    step2Title: 'Pick a Tool',
    step2Desc: 'Choose Hand (browse), Pencil (draw), or Pin (message) from the left toolbar. Zoom in to street level.',
    step3Title: 'Leave Your Mark',
    step3Desc: 'Start drawing or drop a pin. Your work syncs in real-time for the world to see.',
    inkTitle: 'Ink System',
    inkDesc: 'Everyone has 100 ink points. Drawing and pinning cost ink, but it regenerates over time (+1 every 8 seconds, even offline). Use your ink wisely — make every stroke count!',
    inkDetail1: '🖨️ Pencil, Marker, Spray, Highlighter — 4 brush types, each unique',
    inkDetail2: '⭐ Adjustable size & opacity — 54 preset colors + custom',
    inkDetail3: '📌 Pins cost 50 ink — 10 preset colors + custom picker',
    visionTitle: 'Our Vision',
    visionDesc: 'Everyone can leave their mark on this planet. Stroke by stroke, connecting you and me.',
    visionCta: 'Start Drawing →',
    footer: 'Draw on the Real World',
  },
} as const;

const FONT = { fontFamily: 'Fredoka, sans-serif' };

const NAV_ITEMS = [
  { key: 'navFeatures' as const, href: '#features' },
  { key: 'navSteps' as const, href: '#steps' },
  { key: 'navInk' as const, href: '#ink' },
  { key: 'navVision' as const, href: '#vision' },
];

/**
 * Landing page — bold, colorful, cartoon-ish, with language toggle.
 */
export default function HomePage() {
  const [lang, setLang] = useState<Lang>('zh');
  const [scrolled, setScrolled] = useState(false);
  const d = t[lang];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    const id = href.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-hidden font-sans">
      {/* Google Font */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ====== Floating glass topbar ====== */}
      <nav
        className={`fixed left-1/2 top-4 z-50 flex w-[90%] max-w-6xl -translate-x-1/2 items-center justify-between rounded-2xl border px-5 py-3 transition-all duration-300 sm:w-[85%] sm:px-8 sm:py-3.5 ${
          scrolled
            ? 'border-white/30 bg-white/60 shadow-xl backdrop-blur-2xl'
            : 'border-white/20 bg-white/40 shadow-lg backdrop-blur-xl'
        }`}
        style={FONT}
      >
        {/* Logo — left edge */}
        <span className="text-lg font-bold tracking-tight sm:text-xl">🎨 NiubiAgent</span>

        {/* Section links — center */}
        <div className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => scrollTo(item.href)}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-violet-100 hover:text-violet-700 sm:px-4 sm:py-2 sm:text-base"
            >
              {d[item.key]}
            </button>
          ))}
        </div>

        {/* Language toggle — right edge */}
        <button
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-200 sm:px-4 sm:py-2 sm:text-base"
        >
          <Globe className="h-4 w-4" />
          {d.langBtn}
        </button>
      </nav>

      {/* ====== Hero — bright yellow block ====== */}
      <section className="relative bg-amber-300 px-6 pb-24 pt-24 md:px-10 lg:pb-32 lg:pt-28">
        {/* Decorative cartoon shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-orange-400/30" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-yellow-500/30" />
          <div className="absolute right-[20%] bottom-10 h-40 w-40 rotate-12 rounded-[2rem] bg-pink-400/20" />
          <div className="absolute left-[60%] top-16 h-8 w-8 rotate-45 rounded-lg bg-red-500/40" />
          <div className="absolute left-[15%] top-[35%] h-6 w-6 rounded-full bg-blue-500/40" />
          <div className="absolute right-[30%] top-[25%] h-5 w-5 rounded-full bg-green-500/40" />
          {/* Star doodles */}
          <svg className="absolute left-[8%] top-[15%] h-10 w-10 text-white/50" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
          </svg>
          <svg className="absolute right-[12%] top-[60%] h-8 w-8 text-white/40 rotate-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl">
          <p
            className="mb-4 inline-block rounded-full bg-amber-500/30 px-5 py-2 text-base font-semibold tracking-wide text-amber-900/80 md:text-lg"
            style={FONT}
          >
            {d.heroTag}
          </p>
          <h1
            className="text-5xl font-bold leading-[1.15] tracking-tight text-gray-900 sm:text-6xl lg:text-8xl"
            style={FONT}
          >
            {d.heroTitle1}
            <br />
            <span className="text-rose-600">{d.heroTitle2}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-800 md:text-xl lg:text-2xl">
            {d.heroDesc}
          </p>

          <div className="mt-10">
            <Link
              href="/canvas"
              className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-10 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-gray-800 hover:shadow-xl active:scale-95 md:text-xl"
              style={FONT}
            >
              {d.heroCta}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ====== Features — sky block ====== */}
      <section id="features" className="relative bg-sky-400 px-6 py-20 md:px-10 lg:px-16 lg:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-sky-300/50" />
          <div className="absolute -right-10 bottom-10 h-56 w-56 rounded-full bg-blue-500/20" />
          <div className="absolute right-[15%] top-[10%] h-20 w-32 rounded-full bg-white/20" />
          <div className="absolute left-[40%] top-[5%] h-16 w-28 rounded-full bg-white/15" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-4xl font-bold text-white md:text-5xl" style={FONT}>
            {d.featTitle}
          </h2>
          <p className="mx-auto mb-14 max-w-2xl text-center text-lg text-white/80 lg:text-xl">
            {d.featSubtitle}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Palette className="h-10 w-10" />}
              title={d.feat1Title}
              description={d.feat1Desc}
              accent="text-orange-500"
              badge="🎨"
            />
            <FeatureCard
              icon={<MapPin className="h-10 w-10" />}
              title={d.feat2Title}
              description={d.feat2Desc}
              accent="text-blue-500"
              badge="📍"
            />
            <FeatureCard
              icon={<Users className="h-10 w-10" />}
              title={d.feat3Title}
              description={d.feat3Desc}
              accent="text-green-500"
              badge="🌏"
            />
          </div>
        </div>
      </section>

      {/* ====== Steps — pink block ====== */}
      <section id="steps" className="relative bg-rose-400 px-6 py-20 md:px-10 lg:px-16 lg:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-rose-300/40" />
          <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-pink-500/20" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-4xl font-bold text-white md:text-5xl" style={FONT}>
            {d.stepsTitle}
          </h2>
          <p className="mx-auto mb-14 max-w-md text-center text-lg text-white/80">
            {d.stepsSubtitle}
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <StepCard step="01" title={d.step1Title} description={d.step1Desc} />
            <StepCard step="02" title={d.step2Title} description={d.step2Desc} />
            <StepCard step="03" title={d.step3Title} description={d.step3Desc} />
          </div>
        </div>
      </section>

      {/* ====== Ink System — green block ====== */}
      <section id="ink" className="relative bg-emerald-400 px-6 py-20 md:px-10 lg:px-16 lg:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-20 -top-10 h-72 w-72 rounded-full bg-emerald-300/40" />
          <div className="absolute right-[10%] bottom-[15%] h-16 w-16 rotate-12 rounded-2xl bg-teal-500/20" />
        </div>
        <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm">
            <Droplets className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl" style={FONT}>
            {d.inkTitle}
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/90 lg:text-xl">
            {d.inkDesc}
          </p>
          <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
            <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur-sm">
              <p className="text-sm font-medium leading-relaxed text-white">{d.inkDetail1}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur-sm">
              <p className="text-sm font-medium leading-relaxed text-white">{d.inkDetail2}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur-sm">
              <p className="text-sm font-medium leading-relaxed text-white">{d.inkDetail3}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== Vision — purple block ====== */}
      <section id="vision" className="relative bg-violet-500 px-6 py-24 md:px-10 lg:px-16 lg:py-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute right-[10%] top-[20%] h-48 w-48 rounded-full bg-violet-400/30" />
          <div className="absolute left-[10%] bottom-[10%] h-36 w-36 rounded-full bg-purple-600/20" />
        </div>
        <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-10 w-10 text-yellow-300" />
          </div>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl" style={FONT}>
            {d.visionTitle}
          </h2>
          <p className="mx-auto max-w-lg text-xl leading-relaxed text-white/90">
            {d.visionDesc}
          </p>
          <Link
            href="/canvas"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-lg font-bold text-violet-600 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl active:scale-95"
            style={FONT}
          >
            {d.visionCta}
          </Link>
        </div>
      </section>

      {/* ====== Footer ====== */}
      <footer className="bg-gray-900 px-6 py-8 text-center">
        <p className="text-sm text-gray-400" style={FONT}>
          © {new Date().getFullYear()} NiubiAgent · {d.footer}
        </p>
      </footer>
    </div>
  );
}

/* ================================
   Sub-components
   ================================ */

function FeatureCard({
  icon,
  title,
  description,
  accent,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  badge: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[2rem] bg-white p-7 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center gap-3">
        <div className={accent}>{icon}</div>
        <span className="text-2xl">{badge}</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 sm:text-2xl" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-gray-600 sm:text-base">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[2rem] bg-white/20 p-7 backdrop-blur-sm">
      <span
        className="mb-3 inline-block text-5xl font-bold text-white/40"
        style={{ fontFamily: 'Fredoka, sans-serif' }}
      >
        {step}
      </span>
      <h3
        className="mb-2 text-xl font-bold text-white"
        style={{ fontFamily: 'Fredoka, sans-serif' }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-white/90">{description}</p>
    </div>
  );
}
