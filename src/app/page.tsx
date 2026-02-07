import Link from 'next/link';
import { MapPin, Palette, Globe, Sparkles, ArrowRight } from 'lucide-react';

export const runtime = 'edge';

/**
 * Landing page — introduces the project, gameplay, and vision.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/40 to-sky-50/50">
      {/* ====== Header ====== */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-extrabold tracking-tight">
          🎨 NiubiAgent
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-accent transition-colors"
          >
            登录
          </Link>
          <Link
            href="/canvas"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            开始探索
          </Link>
        </div>
      </header>

      {/* ====== Hero ====== */}
      <section className="relative flex flex-col items-center justify-center px-6 pb-20 pt-24 text-center">
        {/* Decorative floating dots */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute left-[15%] top-[20%] h-3 w-3 animate-bounce rounded-full bg-red-400/60" style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <div className="absolute left-[70%] top-[15%] h-4 w-4 animate-bounce rounded-full bg-blue-400/60" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }} />
          <div className="absolute left-[30%] top-[50%] h-2.5 w-2.5 animate-bounce rounded-full bg-yellow-400/60" style={{ animationDelay: '1s', animationDuration: '4s' }} />
          <div className="absolute left-[80%] top-[45%] h-3.5 w-3.5 animate-bounce rounded-full bg-green-400/60" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }} />
          <div className="absolute left-[50%] top-[70%] h-2 w-2 animate-bounce rounded-full bg-purple-400/60" style={{ animationDelay: '0.8s', animationDuration: '3.8s' }} />
          <div className="absolute left-[10%] top-[65%] h-3 w-3 animate-bounce rounded-full bg-pink-400/60" style={{ animationDelay: '2s', animationDuration: '4.2s' }} />
        </div>

        <div className="relative">
          <h1 className="max-w-2xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            在真实地图上
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              和全世界一起涂鸦
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
            选一支画笔，在任何城市的街道上留下你的创作。放一枚图钉，写下一句只有路过的人才能看到的话。
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/canvas"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              开始探索
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-base font-medium transition-colors hover:bg-accent"
            >
              登录账号
            </Link>
          </div>
        </div>
      </section>

      {/* ====== Features ====== */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">玩法介绍</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard
            icon={<Palette className="h-8 w-8 text-orange-500" />}
            title="地图涂鸦"
            description="用铅笔、马克笔、喷枪、荧光笔在真实地图上画画。放大到街道级别，创作只属于这个街角的作品。"
            color="bg-orange-50 border-orange-200"
          />
          <FeatureCard
            icon={<MapPin className="h-8 w-8 text-blue-500" />}
            title="定位留言"
            description="在地图上放置彩色图钉，写下一句话。也许某天，有人路过那里会看到你的留言。"
            color="bg-blue-50 border-blue-200"
          />
          <FeatureCard
            icon={<Globe className="h-8 w-8 text-green-500" />}
            title="共同创作"
            description="所有人的涂鸦都在同一张地图上。路过其他城市时，你会看到来自世界各地的创作。"
            color="bg-green-50 border-green-200"
          />
        </div>
      </section>

      {/* ====== Vision ====== */}
      <section className="border-t bg-gradient-to-b from-purple-50/50 to-white px-6 py-24 text-center">
        <Sparkles className="mx-auto mb-4 h-8 w-8 text-purple-400" />
        <h2 className="text-3xl font-bold">愿景</h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
          每个人都能在这颗星球上留下自己的印记。
          <br />
          一笔一画，连接你我。
        </p>
        <Link
          href="/canvas"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          现在就去画 →
        </Link>
      </section>

      {/* ====== Footer ====== */}
      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NiubiAgent · 在地图上画画
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div
      className={`flex flex-col items-start gap-4 rounded-2xl border p-6 transition-shadow hover:shadow-md ${color}`}
    >
      {icon}
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
