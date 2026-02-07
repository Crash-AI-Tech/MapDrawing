import Link from 'next/link';
import { MapPin, Palette, Globe, Sparkles, ArrowRight, Pen, Droplets, Users } from 'lucide-react';

export const runtime = 'edge';

/**
 * Landing page — bold, colorful, bilingual, inspired by portfolio/illustration sites.
 * Uses large block colors, playful layout, and Google Fonts (Fredoka).
 */
export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden font-sans">
      {/* Google Font for cute headings */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ====== Header ====== */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          🎨 NiubiAgent
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-white/60"
          >
            登录 Login
          </Link>
          <Link
            href="/canvas"
            className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-gray-800 hover:shadow-lg"
          >
            开始探索 Explore →
          </Link>
        </div>
      </header>

      {/* ====== Hero — bright yellow block ====== */}
      <section className="relative bg-amber-300 px-6 pb-24 pt-16 md:px-10 lg:pb-32 lg:pt-20">
        {/* Decorative shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-orange-400/30" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-yellow-500/30" />
          <div className="absolute right-[20%] bottom-10 h-40 w-40 rotate-12 rounded-3xl bg-pink-400/20" />
          <div className="absolute left-[60%] top-10 h-6 w-6 rotate-45 bg-red-500/50" />
          <div className="absolute left-[15%] top-[30%] h-4 w-4 rounded-full bg-blue-500/50" />
          <div className="absolute right-[30%] top-[20%] h-5 w-5 rounded-full bg-green-500/40" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <p
            className="mb-4 text-lg font-semibold tracking-wide text-amber-800/80 md:text-xl"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            DRAW ON THE REAL WORLD 🌍
          </p>
          <h1
            className="text-5xl font-bold leading-[1.15] tracking-tight text-gray-900 sm:text-6xl lg:text-7xl"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            在真实地图上，
            <br />
            <span className="text-rose-600">和全世界一起涂鸦</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-800 md:text-xl">
            选一支画笔，在任何城市的街道上留下你的创作。放一枚图钉，写下一句只有路过的人才能看到的话。
            这里是属于每一个人的画布。
          </p>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-gray-700/80 md:text-lg">
            Pick a brush, leave your mark on any street in any city. Drop a pin, write a message
            only passers-by can read. This is everyone&apos;s canvas.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/canvas"
              className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-gray-800 hover:shadow-xl active:scale-95"
              style={{ fontFamily: 'Fredoka, sans-serif' }}
            >
              开始探索 Start Exploring
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border-2 border-gray-900 bg-transparent px-8 py-4 text-lg font-bold text-gray-900 transition-colors hover:bg-gray-900/5"
              style={{ fontFamily: 'Fredoka, sans-serif' }}
            >
              登录 Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ====== Features — alternating color blocks ====== */}
      <section className="relative bg-sky-400 px-6 py-20 md:px-10 lg:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-sky-300/50" />
          <div className="absolute -right-10 bottom-10 h-56 w-56 rounded-full bg-blue-500/20" />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <h2
            className="mb-4 text-center text-4xl font-bold text-white md:text-5xl"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            玩法介绍 How It Works
          </h2>
          <p className="mx-auto mb-14 max-w-lg text-center text-lg text-white/80">
            三种方式，让你在这颗星球上留下独一无二的印记。
            <br />
            Three ways to leave your unique mark on planet Earth.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Palette className="h-10 w-10" />}
              title="地图涂鸦"
              subtitle="Map Graffiti"
              description="用铅笔、马克笔、喷枪、荧光笔在真实地图上画画。放大到街道级别，创作只属于这个街角的艺术作品。滚动鼠标滚轮缩放到你感兴趣的区域，开始你的创作之旅。"
              descriptionEn="Draw with pencils, markers, spray cans, and highlighters on real-world maps. Zoom into street level and create art that belongs to that very corner."
              bg="bg-white"
              accent="text-orange-500"
            />
            <FeatureCard
              icon={<MapPin className="h-10 w-10" />}
              title="定位留言"
              subtitle="Location Pins"
              description="在地图上放置彩色图钉，写下一句话。也许某天，有人路过那里会看到你的留言。每枚图钉消耗 50 墨水，支持多种颜色和自定义色彩。"
              descriptionEn="Plant a colorful pin on the map with a message. Someday, someone passing by might discover your words. Each pin costs 50 ink."
              bg="bg-white"
              accent="text-blue-500"
            />
            <FeatureCard
              icon={<Users className="h-10 w-10" />}
              title="共同创作"
              subtitle="Co-creation"
              description="所有人的涂鸦都在同一张地图上。路过其他城市时，你会看到来自世界各地的创作。实时同步，你画的每一笔都会立刻被其他人看到。"
              descriptionEn="Everyone draws on the same map. Travel to other cities and discover creations from around the world. Every stroke syncs in real-time."
              bg="bg-white"
              accent="text-green-500"
            />
          </div>
        </div>
      </section>

      {/* ====== How to play — pink block ====== */}
      <section className="relative bg-rose-400 px-6 py-20 md:px-10 lg:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-rose-300/40" />
          <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-pink-500/20" />
        </div>
        <div className="relative mx-auto max-w-4xl">
          <h2
            className="mb-4 text-center text-4xl font-bold text-white md:text-5xl"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            如何开始 Getting Started
          </h2>
          <p className="mx-auto mb-14 max-w-md text-center text-lg text-white/80">
            三步上手，简单到不能再简单。
            <br />
            Three steps — as easy as it gets.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              step="01"
              title="打开地图"
              titleEn="Open the map"
              description="点击「开始探索」按钮，进入地图画布。无需登录即可浏览全世界的创作。"
              descriptionEn="Click 'Start Exploring' to enter the canvas. Browse creations worldwide — no login needed."
            />
            <StepCard
              step="02"
              title="选择工具"
              titleEn="Pick a tool"
              description="从左侧工具栏选择手形（浏览）、画笔（涂鸦）或图钉（留言），然后放大到街道级别。"
              descriptionEn="Choose Hand (browse), Pencil (draw), or Pin (message) from the left toolbar. Zoom in to street level."
            />
            <StepCard
              step="03"
              title="留下印记"
              titleEn="Leave your mark"
              description="开始绘画或放置留言图钉。你的作品会实时同步，让全世界的人看到。"
              descriptionEn="Start drawing or drop a pin. Your work syncs in real-time for the world to see."
            />
          </div>
        </div>
      </section>

      {/* ====== Ink System — green block ====== */}
      <section className="relative bg-emerald-400 px-6 py-20 md:px-10 lg:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-20 -top-10 h-72 w-72 rounded-full bg-emerald-300/40" />
        </div>
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <Droplets className="mb-6 h-12 w-12 text-white" />
          <h2
            className="mb-4 text-4xl font-bold text-white md:text-5xl"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            墨水系统 Ink System
          </h2>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-white/90">
            每个人拥有 100 点墨水。绘画和放置图钉都会消耗墨水，但墨水会随时间恢复（每 8 秒 +1）。
            即使离线，墨水也会继续恢复。合理利用你的墨水，让每一笔都有意义！
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/70">
            Everyone has 100 ink points. Drawing and pinning cost ink, but it regenerates over time
            (+1 every 8 seconds, even offline). Use your ink wisely — make every stroke count!
          </p>
        </div>
      </section>

      {/* ====== Vision — purple block ====== */}
      <section className="relative bg-violet-500 px-6 py-24 md:px-10 lg:py-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute right-[10%] top-[20%] h-48 w-48 rounded-full bg-violet-400/30" />
          <div className="absolute left-[10%] bottom-[10%] h-36 w-36 rounded-full bg-purple-600/20" />
        </div>
        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <Sparkles className="mb-6 h-12 w-12 text-yellow-300" />
          <h2
            className="mb-4 text-4xl font-bold text-white md:text-5xl"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            愿景 Our Vision
          </h2>
          <p className="mx-auto max-w-lg text-xl leading-relaxed text-white/90">
            每个人都能在这颗星球上留下自己的印记。一笔一画，连接你我。
          </p>
          <p className="mx-auto mt-3 max-w-lg text-lg leading-relaxed text-white/70">
            Everyone can leave their mark on this planet. Stroke by stroke, connecting you and me.
          </p>
          <Link
            href="/canvas"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-lg font-bold text-violet-600 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl active:scale-95"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            现在就去画 Start Drawing →
          </Link>
        </div>
      </section>

      {/* ====== Footer ====== */}
      <footer className="bg-gray-900 px-6 py-8 text-center">
        <p className="text-sm text-gray-400" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          © {new Date().getFullYear()} NiubiAgent · Draw on the Real World · 在地图上画画
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
  subtitle,
  description,
  descriptionEn,
  bg,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  descriptionEn: string;
  bg: string;
  accent: string;
}) {
  return (
    <div className={`flex flex-col gap-4 rounded-3xl ${bg} p-7 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl`}>
      <div className={accent}>{icon}</div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          {title}
        </h3>
        <p className="text-sm font-medium text-gray-400" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          {subtitle}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-gray-700">{description}</p>
      <p className="text-xs leading-relaxed text-gray-400">{descriptionEn}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  titleEn,
  description,
  descriptionEn,
}: {
  step: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
}) {
  return (
    <div className="rounded-3xl bg-white/20 p-7 backdrop-blur-sm">
      <span
        className="mb-3 inline-block text-5xl font-bold text-white/40"
        style={{ fontFamily: 'Fredoka, sans-serif' }}
      >
        {step}
      </span>
      <h3
        className="mb-1 text-xl font-bold text-white"
        style={{ fontFamily: 'Fredoka, sans-serif' }}
      >
        {title}
      </h3>
      <p className="mb-2 text-sm font-medium text-white/60" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        {titleEn}
      </p>
      <p className="text-sm leading-relaxed text-white/90">{description}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/60">{descriptionEn}</p>
    </div>
  );
}
