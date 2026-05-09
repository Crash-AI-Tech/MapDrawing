import { getCloudflareContext } from '@opennextjs/cloudflare';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const t = {
  zh: { createdBy: '由 DrawMap 创建', openApp: '打开 DrawMap 绘制' },
  en: { createdBy: 'Created with DrawMap', openApp: 'Open DrawMap to draw' },
};

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!UUID_RE.test(id)) notFound();

  const { env } = getCloudflareContext();
  const hdrs = await headers();
  const acceptLang = hdrs.get('accept-language') ?? '';
  const lang = acceptLang.startsWith('zh') ? 'zh' : 'en';
  const d = t[lang];

  // Try PNG first, then JPG
  let obj = await env.BUCKET.get(`shares/${id}.png`);
  let contentType = 'image/png';
  if (!obj) {
    obj = await env.BUCKET.get(`shares/${id}.jpg`);
    contentType = 'image/jpeg';
  }
  if (!obj) notFound();

  const ext = contentType === 'image/jpeg' ? 'jpg' : 'png';
  const imageUrl = `/shares/${id}.${ext}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Shared drawing"
          className="h-auto w-full"
        />
        <div className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-sm text-muted-foreground">{d.createdBy}</p>
          <a
            href="/canvas"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            {d.openApp}
          </a>
        </div>
      </div>
    </div>
  );
}
