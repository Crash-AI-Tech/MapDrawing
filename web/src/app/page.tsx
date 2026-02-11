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
    navCta: '开始探索',
    langBtn: 'EN',
    // hero
    heroTag: '在真实地图上画画 🌍',
    heroTitle1: '在真实地图上，',
    heroTitle2: '和全世界一起涂鸦',
    heroDesc: '选一支画笔，在任何城市的街道上留下你的创作。MapLibre GL 引擎提供 60fps 极速体验。放一枚图钉，写下一句只有路过的人才能看到的话。这里是属于每一个人的全球画布，每一笔都被持久化保存。',
    heroCta: '开始探索 ',
    // features
    featTitle: '玩法介绍',
    featSubtitle: '三种方式，让你在这颗星球上留下独一无二的印记。基于 Cloudflare 边缘计算，无论身在何处，创作即同步。',
    feat1Title: '无限地图涂鸦',
    feat1Desc: '提供铅笔、马尔克笔、喷枪、荧光笔四种专业工具。每一笔都实时对应地理坐标。支持 R-tree 空间索引，即使累计千万级笔画也能瞬时加载。从小巷到珠峰，每一处都是您的。',
    feat2Title: '全球定位留言',
    feat2Desc: '在地图任意位置放置彩色图钉并留言。支持 10 种主题颜色，50 字以内精炼表达。路过同一坐标的玩家将发现您的故事。图钉点击即展开，全量保留历史。',
    feat3Title: '实时共同创作',
    feat3Desc: '全球玩家共享同一张画布。基于 Durable Objects 技术，每房间支持 500+ 连接。路过异国他乡时，您能看到当地正在发生的艺术创作。零延迟感受来自全球的笔触。',
    // steps
    stepsTitle: '如何快速上手',
    stepsSubtitle: '三步开启您的全球艺术之旅。Tip: 建议使用双指缩放地图以获得更佳体验。',
    step1Title: '漫游并精确定位',
    step1Desc: '浏览全世界地图，定位到您心仪的角落。放大至 18 级以上即可开始绘图，20 级以上可放置高精度图钉。Tip: 地图基于矢量瓦片，缩放平滑无损。',
    step2Title: '定制化艺术工具',
    step2Desc: '从侧栏调出画笔或图钉。您可以根据创作需要调节尺寸、颜色和透明度。Tip: 荧光笔采用乘法混合，喷枪则能制造柔美的渐变阴影。',
    step3Title: '留下持久化印记',
    step3Desc: '开始绘画或放置留言。系统采用 UUID v7 时间有序存储，确保您的每一秒创作都有迹可循。Tip: 墨水每 18 秒自动恢复，断网期间仍会计秒，重连后自动同步。',
    // ink
    inkTitle: '公平公平的墨水系统',
    inkDesc: 'Map 采用独特的面积-缩放成本模型。您的初始储备为 100 点。关键设计：缩放级别(zoom)每降低一级，同等屏幕长度的笔画消耗翻 4 倍。这种机制鼓励玩家在高缩放级别进行精细化微观创作，同时有效防止了低等级下的恶意覆盖。',
    inkDetail1: '📏 zoom 越低消耗越高 — 保护大尺度地图景观',
    inkDetail2: '⚡ 18秒/+1 自动回墨 — 即使离线重连也不中断',
    inkDetail3: '🎨 画笔尺寸影响消耗 — 鼓励用更细致的笔触叙事',
    // vision
    visionTitle: '我们的愿景',
    visionDesc: '每个人都能在这颗星球上留下自己的印记。一笔一画，连接不同时空的你我。我们致力于构建一个永不消失的、全人类共同打造的数字地球。',
    visionCta: '前往创作之门 →',
    // footer
    footer: 'Map — 全球实时协作绘画平台',
  },
  en: {
    navFeatures: 'Features',
    navSteps: 'Guide',
    navInk: 'Ink',
    navVision: 'Vision',
    navCta: 'Start Exploring',
    langBtn: '中文',
    heroTag: 'DRAW ON THE REAL WORLD 🌍',
    heroTitle1: 'Draw on the',
    heroTitle2: 'Real World Map',
    heroDesc: 'Pick a brush, leave your mark on any street in any city. Driven by MapLibre GL for smooth 60fps. Drop a pin, write a message only passers-by can read. This is everyone\'s global canvas, where every stroke is persisted forever as digital heritage.',
    heroCta: 'Start Exploring →',
    featTitle: 'How It Works',
    featSubtitle: 'Three ways to leave your unique mark on planet Earth. Built with Cloudflare edge, your creativity syncs instantly from anywhere.',
    feat1Title: 'Infinite Map Graffiti',
    feat1Desc: 'Use 4 pro brushes: Pencil, Marker, Spray, and Highlighter. Every stroke is tied to a lat/lng. Spatial R-tree indexing ensures instant loading of even millions of strokes. From backyards to Mt. Everest, it\'s all yours.',
    feat2Title: 'Global Location Pins',
    feat2Desc: 'Plant a colored pin and share your story. Support for 10 themes and 50-character messages. People passing through the same coordinates will discover your tale. Click to expand and view history.',
    feat3Title: 'Real-time Co-creation',
    feat3Desc: 'A single global canvas for everyone. Built with Durable Objects, supporting 500+ concurrent artists per room. Roam to distant lands and watch art happen live. Feel the strokes of the world with zero latency.',
    stepsTitle: 'Start Your Journey',
    stepsSubtitle: 'Three easy steps to begin. Tip: Use 2-finger pinch-to-zoom for the best experience on mobile.',
    step1Title: 'Locate Your Spot',
    step1Desc: 'Browse the Earth to find that one coordinate that matters. Zoom level 18+ to draw, 20+ to drop high-precision pins. Tip: Vector-tile map engine ensures lossless zooming.',
    step2Title: 'Choose Your Tools',
    step2Desc: 'Pick Brush or Pin from the sidebar. Adjust size, color, and opacity to fit your vision. Tip: Try Highlighter for multiplicative blending and Spray for soft gradients.',
    step3Title: 'Persist Your Creativity',
    step3Desc: 'Every stroke counts. Strokes are stored chronologically using UUID v7. Tip: Ink regenerates 1 unit every 18s even offline; the system auto-flushes events upon reconnection.',
    inkTitle: 'Fair & Transparent Ink',
    inkDesc: 'We use a unique area-zoom cost model. Your pool is 100 ink points. Crucial: Ink cost quadruples for every zoom level decrease. This encourages detailed micro-scale artistry while effectively preventing mass-coverage spam and land-grabbing.',
    inkDetail1: '📏 Lower zoom = Higher cost — Protect global landscapes',
    inkDetail2: '⚡ 18s/+1 Regen — Continuous recovery even when offline',
    inkDetail3: '🎨 Size affects cost — Encouraging delicate, detailed storytelling',
    visionTitle: 'Our Vision',
    visionDesc: 'Everyone can leave their mark on this planet. Stroke by stroke, connecting souls across time and space. We aim to build a digital Earth created by everyone, for everyone.',
    visionCta: 'Enter Canvas →',
    footer: 'Map — Global Collaborative Art Platform',
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
  const [lang, setLang] = useState<Lang>('en');
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
        className={`fixed left-1/2 top-4 z-50 flex w-[90%] max-w-6xl -translate-x-1/2 items-center justify-between rounded-full border px-5 py-3 transition-all duration-300 sm:w-[85%] sm:px-8 sm:py-3.5 ${scrolled
          ? 'border-white/30 bg-white/60 shadow-xl backdrop-blur-2xl'
          : 'border-white/20 bg-white/40 shadow-lg backdrop-blur-xl'
          }`}
        style={FONT}
      >
        {/* Logo — left edge */}
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-bold tracking-tight sm:text-xl">Map</span>
        </div>

        {/* Section links — center */}
        <div className="hidden items-center gap-1 sm:flex sm:gap-2">
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

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Language toggle — right */}
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-200 sm:px-4 sm:py-2 sm:text-base"
          >
            <Globe className="h-4 w-4" />
            {d.langBtn}
          </button>

          {/* Start Exploring Button — rightmost */}
          <Link
            href="/canvas"
            className="hidden items-center rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-gray-800 sm:flex sm:text-base"
          >
            {d.navCta}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* ====== Hero Section ====== */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden bg-amber-300 px-6 pt-24 text-left">
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

        <div className="container relative z-10 mx-auto grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            <p
              className="mb-4 inline-block rounded-full bg-amber-500/30 px-5 py-2 text-base font-bold tracking-wide text-amber-900/80 md:text-lg"
              style={FONT}
            >
              {d.heroTag}
            </p>
            <h1
              className="text-5xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl lg:text-8xl"
              style={FONT}
            >
              {d.heroTitle1}
              <br />
              <span className="text-rose-600">{d.heroTitle2}</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-gray-800 md:text-xl lg:text-2xl">
              {d.heroDesc}
            </p>

            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/canvas"
                className="group flex items-center gap-2 rounded-full bg-gray-900 px-10 py-5 text-xl font-bold text-white shadow-lg transition-all hover:bg-gray-800 hover:shadow-xl active:scale-95"
                style={FONT}
              >
                {d.heroCta}
                <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                onClick={() => scrollTo('#features')}
                className="rounded-full border-2 border-amber-400/40 bg-white/40 px-10 py-5 text-xl font-bold text-gray-700 transition-all hover:bg-white/60 active:scale-95 backdrop-blur-sm"
                style={FONT}
              >
                {d.navFeatures}
              </button>
            </div>
          </div>

          {/* Right: Illustration */}
          <div className="flex items-center justify-center">
            <div className="animate-float relative overflow-hidden rounded-[2.5rem] bg-white p-3 shadow-2xl ring-8 ring-amber-400/20">
              <img
                src="/hero-illustration.png"
                alt="Illustration"
                className="w-full max-w-lg rounded-[1.8rem] transition-transform hover:scale-105 duration-500"
              />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 transform animate-bounce text-gray-400 opacity-60">
          <div className="h-10 w-6 rounded-full border-2 border-gray-400 p-1">
            <div className="mx-auto h-2 w-1 rounded-full bg-gray-400" />
          </div>
        </div>

        {/* Wave to Next Section (Sky Blue) */}
        <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-sky-400">
          <WavySeparator />
        </div>
      </section>

      {/* ====== Features — sky block ====== */}
      <section id="features" className="relative bg-sky-400 px-6 pb-32 pt-20 md:px-10 lg:px-16 lg:pb-40 lg:pt-28">
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

        {/* Wave to Next Section (Rose) */}
        <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-rose-400">
          <WavySeparator className="scale-x-[-1]" />
        </div>
      </section>

      {/* ====== Steps — pink block ====== */}
      <section id="steps" className="relative bg-rose-400 px-6 pb-32 pt-20 md:px-10 lg:px-16 lg:pb-40 lg:pt-28">
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

        {/* Wave to Next Section (Emerald) */}
        <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-emerald-400">
          <WavySeparator />
        </div>
      </section>

      {/* ====== Ink System — green block ====== */}
      <section id="ink" className="relative bg-emerald-400 px-6 pb-32 pt-20 md:px-10 lg:px-16 lg:pb-40 lg:pt-28">
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

        {/* Wave to Next Section (Violet) */}
        <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-violet-500">
          <WavySeparator className="scale-x-[-1]" />
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
          © {new Date().getFullYear()} Map · {d.footer}
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


/**
 * Irregular Wavy Separator (big waves).
 * Fits at the bottom of a section to transition to the next color.
 */
function WavySeparator({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 120"
      className={`block w-full ${className || ''}`}
      fill="currentColor"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z" />
    </svg>
  );
}
