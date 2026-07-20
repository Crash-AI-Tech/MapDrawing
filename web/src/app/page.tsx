'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Palette, Sparkles, ArrowRight, Droplets, Users, Plane, GraduationCap, Globe2, Shield, Trash2 } from 'lucide-react';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { WavySeparator } from '@/components/marketing/WavySeparator';
import { useI18n } from '@/lib/i18n';

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
    feat1Desc: '使用铅笔留下细腻笔触，也可以随时切换橡皮擦。每一笔都对应真实地理坐标，并通过地理瓦片按需加载，让地图保持轻快。',
    feat2Title: '全球定位留言',
    feat2Desc: '在地图任意位置放置彩色图钉并留言。支持 10 种主题颜色，50 字以内精炼表达。路过同一坐标的玩家将发现您的故事。图钉点击即展开，全量保留历史。',
    feat3Title: '跨设备共同创作',
    feat3Desc: 'Web 与 iOS 共享同一张全球画布。创作安全保存到 Cloudflare 边缘服务，并在重新连接后继续同步。',
    // steps
    stepsTitle: '如何快速上手',
    stepsSubtitle: '三步开启您的全球艺术之旅。Tip: 建议使用双指缩放地图以获得更佳体验。',
    step1Title: '漫游并精确定位',
    step1Desc: '浏览全世界地图，定位到您心仪的角落。放大至 18 级以上即可开始绘图，20 级以上可放置高精度图钉。Tip: 地图基于矢量瓦片，缩放平滑无损。',
    step2Title: '定制化艺术工具',
    step2Desc: '从工具栏选择画笔或图钉，并按创作需要调节尺寸、颜色和透明度。再次点击画笔即可切换橡皮擦。',
    step3Title: '留下持久化印记',
    step3Desc: '开始绘画或放置留言。系统采用 UUID v7 时间有序存储，确保您的每一秒创作都有迹可循。Tip: 墨水每 18 秒自动恢复，断网期间仍会计秒，重连后自动同步。',
    // ink
    inkTitle: '公平透明的墨水系统',
    inkDesc: 'Map 采用独特的面积-缩放成本模型。您的初始储备为 100 点。关键设计：缩放级别(zoom)每降低一级，同等屏幕长度的笔画消耗翻 4 倍。这种机制鼓励玩家在高缩放级别进行精细化微观创作，同时有效防止了低等级下的恶意覆盖。',
    inkDetail1: '📏 zoom 越低消耗越高 — 保护大尺度地图景观',
    inkDetail2: '⚡ 18秒/+1 自动回墨 — 即使离线重连也不中断',
    inkDetail3: '🎨 画笔尺寸影响消耗 — 鼓励用更细致的笔触叙事',
    // discovery
    useCasesTitle: '地图上的灵感，来自每一种生活',
    useCasesSubtitle: '一幅小画、一段回忆或一句问候，都能让一个地点拥有新的故事。',
    useCases: [
      { title: '旅行记忆', description: '把旅途中难忘的一刻画在故事发生的地点，让记忆真正落在地图上。' },
      { title: '社区共创', description: '从街道、公园到校园，邀请熟悉同一地点的人一起完成作品。' },
      { title: '地点学习', description: '通过绘画探索地理、文化和比例尺，让知识与真实空间连接。' },
      { title: '远程协作', description: '和身处不同城市的朋友共享一张画布，不需要分享实时 GPS。' },
    ],
    useCasesCta: '查看更多使用灵感 →',
    faqSectionTitle: '你可能想知道',
    faqSectionSubtitle: '关于定位、墨水、跨设备同步和社区安全的直接回答。',
    faqItems: [
      { question: 'DrawMaps 会追踪我的 GPS 位置吗？', answer: '不会。iOS 应用不请求设备定位权限，只保存你在地图上主动选择的坐标。' },
      { question: 'Web 与 iOS 的内容互通吗？', answer: '是。登录后两端共享账号、全球画布、墨水余额和屏蔽列表。' },
      { question: '墨水用完后怎么办？', answer: '墨水上限为 100 点，每 18 秒自动恢复 1 点；更细致的笔画消耗更少。' },
      { question: '遇到不当内容怎么办？', answer: '你可以举报绘画或图钉，也可以屏蔽用户；我们会根据规则审核和处理。' },
    ],
    faqCta: '查看全部常见问题 →',
    safetySectionTitle: '放心创作，也尊重每一个人',
    safetySectionDesc: '共享画布默认公开。我们提供清晰的位置隐私、内容治理和账号控制，让创作更安心。',
    safetyFacts: ['不请求 iOS GPS 定位权限', '支持举报和屏蔽用户', '可以在产品内删除账号'],
    safetyCta: '了解安全与隐私 →',
    // vision
    visionTitle: '我们的愿景',
    visionDesc: '每个人都能在这颗星球上留下自己的印记。一笔一画，连接不同时空的你我。我们希望构建一颗由大家共同创作、持续生长的数字地球。',
    visionCta: '前往创作之门 →',
    // footer
    footer: 'Map — 全球实时协作绘画平台',
    support: '支持', privacy: '隐私政策', terms: '服务条款',
    learn: '产品资料', faq: '常见问题', safety: '安全与隐私', press: '媒体资料',
  },
  en: {
    navFeatures: 'Features',
    navSteps: 'Guide',
    navInk: 'Ink',
    navVision: 'Vision',
    navCta: 'Start Exploring',
    heroTag: 'DRAW ON THE REAL WORLD 🌍',
    heroTitle1: 'Draw on the',
    heroTitle2: 'Real World Map',
    heroDesc: 'Pick a brush and leave your mark on any street in any city. Drop a pin with a short message and build one shared global canvas across Web and iOS.',
    heroCta: 'Start Exploring →',
    featTitle: 'How It Works',
    featSubtitle: 'Three ways to leave your unique mark on planet Earth. Built with Cloudflare edge, your creativity syncs instantly from anywhere.',
    feat1Title: 'Infinite Map Graffiti',
    feat1Desc: 'Use a precise pencil and switch to the eraser at any time. Every stroke is tied to real coordinates and loaded on demand through geographic tiles.',
    feat2Title: 'Global Location Pins',
    feat2Desc: 'Plant a colored pin and share your story. Support for 10 themes and 50-character messages. People passing through the same coordinates will discover your tale. Click to expand and view history.',
    feat3Title: 'Create Across Devices',
    feat3Desc: 'Web and iOS share one global canvas. Creations are stored on Cloudflare edge services and continue syncing after a connection returns.',
    stepsTitle: 'Start Your Journey',
    stepsSubtitle: 'Three easy steps to begin. Tip: Use 2-finger pinch-to-zoom for the best experience on mobile.',
    step1Title: 'Locate Your Spot',
    step1Desc: 'Browse the Earth to find that one coordinate that matters. Zoom level 18+ to draw, 20+ to drop high-precision pins. Tip: Vector-tile map engine ensures lossless zooming.',
    step2Title: 'Choose Your Tools',
    step2Desc: 'Choose Pencil or Pin from the toolbar, then adjust size, color, and opacity. Click Pencil again to switch to the eraser.',
    step3Title: 'Persist Your Creativity',
    step3Desc: 'Every stroke counts. Strokes are stored chronologically using UUID v7. Tip: Ink regenerates 1 unit every 18s even offline; the system auto-flushes events upon reconnection.',
    inkTitle: 'Fair & Transparent Ink',
    inkDesc: 'We use a unique area-zoom cost model. Your pool is 100 ink points. Crucial: Ink cost quadruples for every zoom level decrease. This encourages detailed micro-scale artistry while effectively preventing mass-coverage spam and land-grabbing.',
    inkDetail1: '📏 Lower zoom = Higher cost — Protect global landscapes',
    inkDetail2: '⚡ 18s/+1 Regen — Continuous recovery even when offline',
    inkDetail3: '🎨 Size affects cost — Encouraging delicate, detailed storytelling',
    useCasesTitle: 'Every place can inspire a different story',
    useCasesSubtitle: 'A small sketch, a memory, or a local hello can give a place a new creative layer.',
    useCases: [
      { title: 'Travel memories', description: 'Draw a memorable moment close to where it happened and place the story on the map.' },
      { title: 'Neighborhood art', description: 'Invite people who know the same street, park, or campus to create together.' },
      { title: 'Place-based learning', description: 'Connect geography, culture, and visual storytelling with real-world space.' },
      { title: 'Remote collaboration', description: 'Share one canvas with friends in different cities without sharing live GPS.' },
    ],
    useCasesCta: 'Explore more ideas →',
    faqSectionTitle: 'Good questions, clear answers',
    faqSectionSubtitle: 'The essentials about location, ink, device sync, and community safety.',
    faqItems: [
      { question: 'Does DrawMaps track my GPS location?', answer: 'No. The iOS app does not request device-location permission. It only stores map coordinates you intentionally select.' },
      { question: 'Do Web and iOS share the same content?', answer: 'Yes. After login, both clients share the account, global canvas, ink balance, and blocked-user list.' },
      { question: 'What happens when I run out of ink?', answer: 'Ink is capped at 100 points and regenerates by 1 every 18 seconds. Smaller, detailed strokes cost less.' },
      { question: 'What can I do about inappropriate content?', answer: 'You can report a drawing or pin and block a user. Reports are reviewed against the community rules.' },
    ],
    faqCta: 'Read all questions →',
    safetySectionTitle: 'Create freely, respect every person',
    safetySectionDesc: 'The shared canvas is public by default. Clear location privacy, moderation, and account controls make creation safer.',
    safetyFacts: ['No iOS GPS permission request', 'Reporting and user blocking', 'In-product account deletion'],
    safetyCta: 'Learn about safety →',
    visionTitle: 'Our Vision',
    visionDesc: 'Everyone can leave their mark on this planet. Stroke by stroke, connecting souls across time and space. We aim to build a digital Earth created by everyone, for everyone.',
    visionCta: 'Enter Canvas →',
    footer: 'Map — Global Collaborative Art Platform',
    support: 'Support', privacy: 'Privacy Policy', terms: 'Terms of Service',
    learn: 'Product Guide', faq: 'FAQ', safety: 'Safety', press: 'Press Kit',
  },
  ja: {
    navFeatures: '機能', navSteps: '使い方', navInk: 'インク', navVision: 'ビジョン', navCta: '探索を始める',
    heroTag: '現実の地図に描こう 🌍', heroTitle1: 'リアルワールドの', heroTitle2: '地図に描こう',
    heroDesc: '好きな街や通りを選び、地図の上に作品を残しましょう。ピンに短いメッセージを添え、世界中の人と一枚のキャンバスを共有できます。',
    heroCta: '探索を始める →', featTitle: '楽しみ方',
    featSubtitle: '地球上に自分だけの印を残す三つの方法。Cloudflare のエッジ基盤から安全に同期します。',
    feat1Title: '地図への自由な描画',
    feat1Desc: '精密な鉛筆を使い、いつでも消しゴムに切り替えられます。すべての線は実際の座標に結び付けられ、地理タイル単位で必要な分だけ読み込まれます。',
    feat2Title: '位置にメッセージを残す',
    feat2Desc: '地図上に色付きのピンと短いメッセージを残せます。同じ場所を訪れた人があなたの物語を見つけます。',
    feat3Title: 'デバイスを越えて共同制作',
    feat3Desc: 'Web と iOS は同じグローバルキャンバスを共有します。作品はエッジサービスに保存され、再接続後も同期を続けます。',
    stepsTitle: 'はじめ方', stepsSubtitle: '三つの手順で創作を始められます。モバイルでは二本指で地図を拡大してください。',
    step1Title: '場所を見つける', step1Desc: '世界地図を移動し、描きたい場所を見つけます。描画はズーム18以上、ピンはズーム20以上で利用できます。',
    step2Title: 'ツールを整える', step2Desc: '鉛筆またはピンを選び、サイズ、色、不透明度を調整します。鉛筆をもう一度押すと消しゴムに切り替わります。',
    step3Title: '作品を残す', step3Desc: '描画やメッセージは安全に保存されます。インクは18秒ごとに回復し、オフライン操作は再接続後に同期されます。',
    inkTitle: '公平で透明なインク',
    inkDesc: '100ポイントのインクを使う面積・ズーム連動モデルです。広い範囲を覆うほどコストが高くなり、細かな創作を促します。',
    inkDetail1: '📏 低いズームほど高コスト — 広域の上書きを防止',
    inkDetail2: '⚡ 18秒ごとに1回復 — オフライン中も継続',
    inkDetail3: '🎨 太さもコストに反映 — 丁寧な表現を応援',
    useCasesTitle: '場所ごとに、新しい物語が生まれる',
    useCasesSubtitle: '小さな絵、思い出、地域への挨拶が、その場所に新しい創作の層を加えます。',
    useCases: [
      { title: '旅の記憶', description: '忘れたくない瞬間を、出来事があった場所の近くに描いて残します。' },
      { title: '地域の共同制作', description: '同じ通り、公園、学校を知る人たちと一つの作品を育てます。' },
      { title: '場所を使った学習', description: '地理、文化、視覚的な物語を現実の空間と結び付けます。' },
      { title: '遠隔コラボレーション', description: 'リアルタイム GPS を共有せず、別の都市の友人と同じキャンバスで制作します。' },
    ],
    useCasesCta: '活用アイデアを見る →',
    faqSectionTitle: 'よくある質問に、明確な回答を',
    faqSectionSubtitle: '位置情報、インク、端末間同期、コミュニティの安全について説明します。',
    faqItems: [
      { question: 'GPS 位置を追跡しますか？', answer: 'いいえ。iOS は端末位置権限を要求せず、地図上で自分が選んだ座標だけを保存します。' },
      { question: 'Web と iOS は同じ内容ですか？', answer: 'はい。ログイン後はアカウント、キャンバス、インク、ブロックリストを共有します。' },
      { question: 'インクがなくなったら？', answer: '上限は 100 で、18 秒ごとに 1 回復します。細かな線ほど消費を抑えられます。' },
      { question: '不適切な内容を見つけたら？', answer: '描画やピンを通報し、ユーザーをブロックできます。通報はルールに沿って確認されます。' },
    ],
    faqCta: 'すべての質問を見る →',
    safetySectionTitle: '自由な創作と、互いへの配慮',
    safetySectionDesc: '共有キャンバスは原則公開です。位置プライバシー、審査、アカウント管理を明確にしています。',
    safetyFacts: ['iOS の GPS 権限を要求しない', '通報とユーザーブロック', '製品内でアカウント削除'],
    safetyCta: '安全とプライバシーを見る →',
    visionTitle: '私たちのビジョン',
    visionDesc: '誰もがこの地球に自分の印を残せること。一本の線から、時間と場所を越えて人々をつなぐデジタル地球を目指します。',
    visionCta: 'キャンバスを開く →', footer: 'Map — グローバル共同アートプラットフォーム',
    support: 'サポート', privacy: 'プライバシーポリシー', terms: '利用規約',
    learn: '製品ガイド', faq: 'よくある質問', safety: '安全', press: 'プレス資料',
  },
} as const;

const FONT = { fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif' };

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
  const { lang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const d = t[lang];
  const publicLocale = lang === 'zh' ? 'zh-cn' : lang;

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
          <Image src="/logo.png" alt="DrawMaps" width={32} height={32} className="h-8 w-8 rounded-lg" priority />
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
          <LanguageSelector className="rounded-full bg-violet-50 px-2 py-1" compact showIcon={false} />

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
              <Image
                src="/hero-illustration.png"
                alt="DrawMaps map drawing preview"
                width={768}
                height={768}
                className="w-full max-w-lg rounded-[1.8rem] transition-transform hover:scale-105 duration-500"
                priority
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

        {/* Wave to Next Section (Orange) */}
        <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-orange-400">
          <WavySeparator className="scale-x-[-1]" />
        </div>
      </section>

      {/* ====== Use cases — orange block ====== */}
      <section className="relative bg-orange-400 px-6 pb-32 pt-20 md:px-10 lg:px-16 lg:pb-40 lg:pt-28">
        <div className="relative mx-auto max-w-7xl">
          <h2 className="mx-auto max-w-3xl text-center text-4xl font-bold text-white md:text-5xl" style={FONT}>
            {d.useCasesTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-white/85">
            {d.useCasesSubtitle}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {d.useCases.map((item, index) => {
              const Icon = [Plane, Users, GraduationCap, Globe2][index];
              return (
                <article key={item.title} className="rounded-[2rem] bg-white p-7 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900" style={FONT}>{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.description}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link href={`/${publicLocale}/use-cases`} className="inline-flex items-center rounded-full bg-gray-900 px-7 py-3 font-bold text-white shadow-lg transition hover:bg-gray-800">
              {d.useCasesCta}
            </Link>
          </div>
        </div>
        <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-indigo-500">
          <WavySeparator />
        </div>
      </section>

      {/* ====== FAQ — indigo block ====== */}
      <section className="relative bg-indigo-500 px-6 pb-32 pt-20 md:px-10 lg:px-16 lg:pb-40 lg:pt-28">
        <div className="relative mx-auto max-w-5xl">
          <h2 className="text-center text-4xl font-bold text-white md:text-5xl" style={FONT}>{d.faqSectionTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-white/80">{d.faqSectionSubtitle}</p>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {d.faqItems.map((item) => (
              <details key={item.question} className="group rounded-[2rem] bg-white px-7 py-6 shadow-lg open:shadow-xl">
                <summary className="cursor-pointer text-lg font-bold text-gray-900 marker:text-indigo-500" style={FONT}>{item.question}</summary>
                <p className="mt-4 text-sm leading-relaxed text-gray-600">{item.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href={`/${publicLocale}/faq`} className="inline-flex items-center rounded-full bg-white px-7 py-3 font-bold text-indigo-600 shadow-lg transition hover:bg-indigo-50">
              {d.faqCta}
            </Link>
          </div>
        </div>
        <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-amber-300">
          <WavySeparator className="scale-x-[-1]" />
        </div>
      </section>

      {/* ====== Safety — yellow block ====== */}
      <section className="relative bg-amber-300 px-6 pb-32 pt-20 md:px-10 lg:px-16 lg:pb-40 lg:pt-28">
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/60 text-amber-700 shadow-sm">
              <Shield className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 md:text-5xl" style={FONT}>{d.safetySectionTitle}</h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-700">{d.safetySectionDesc}</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {d.safetyFacts.map((fact, index) => {
              const Icon = [MapPin, Shield, Trash2][index];
              return (
                <div key={fact} className="flex items-center gap-4 rounded-[2rem] bg-white/70 px-6 py-5 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-semibold text-gray-800">{fact}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link href={`/${publicLocale}/safety`} className="inline-flex items-center rounded-full bg-gray-900 px-7 py-3 font-bold text-white shadow-lg transition hover:bg-gray-800">
              {d.safetyCta}
            </Link>
          </div>
        </div>
        <div className="absolute bottom-[-1px] left-0 w-full rotate-180 leading-none text-violet-500">
          <WavySeparator />
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
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3">
          <p className="text-sm text-gray-400" style={FONT}>
            © {new Date().getFullYear()} DrawMaps · {d.footer}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link
              href={`/${publicLocale}/how-it-works`}
              className="text-sm text-gray-500 transition-colors hover:text-violet-400"
            >
              {d.learn}
            </Link>
            <Link
              href={`/${publicLocale}/faq`}
              className="text-sm text-gray-500 transition-colors hover:text-violet-400"
            >
              {d.faq}
            </Link>
            <Link
              href={`/${publicLocale}/safety`}
              className="text-sm text-gray-500 transition-colors hover:text-violet-400"
            >
              {d.safety}
            </Link>
            <Link
              href={`/${publicLocale}/press`}
              className="text-sm text-gray-500 transition-colors hover:text-violet-400"
            >
              {d.press}
            </Link>
            <span className="text-gray-700">·</span>
            <Link
              href={`/support?lang=${lang}`}
              className="text-sm text-gray-500 transition-colors hover:text-violet-400"
            >
              {d.support}
            </Link>
            <span className="text-gray-700">·</span>
            <Link
              href={`/legal/privacy?lang=${lang}`}
              className="text-sm text-gray-500 transition-colors hover:text-violet-400"
            >
              {d.privacy}
            </Link>
            <span className="text-gray-700">·</span>
            <Link
              href={`/legal/terms?lang=${lang}`}
              className="text-sm text-gray-500 transition-colors hover:text-violet-400"
            >
              {d.terms}
            </Link>
          </div>
        </div>
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
