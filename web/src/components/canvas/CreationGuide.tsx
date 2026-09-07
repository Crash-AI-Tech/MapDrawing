'use client';
import { useState } from 'react';
import { ArrowUpRight, Check, Compass, Pencil, Share2, X } from 'lucide-react';
import { journeyText, mapLocationQuery } from '@niubi/shared';
import { useI18n } from '@/lib/i18n';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useDrawingStore } from '@/stores/drawingStore';
import { usePinStore } from '@/stores/pinStore';
import { trackEvent } from '@/lib/analytics';

export default function CreationGuide({ onLogin }: { onLogin: () => void }) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const user = useAuthStore(s => s.user);
  const state = useUIStore(s => s.syncState);
  const limited = useUIStore(s => s.contentLimited);
  const location = useUIStore(s => s.mapLocation);
  const hasPractice = useUIStore(s => s.hasPractice);
  const text = (key: Parameters<typeof journeyText>[0]) => journeyText(key, lang);
  const start = () => {
    trackEvent('tool_try');
    window.dispatchEvent(new CustomEvent('map:zoom-to', { detail: 18 }));
    usePinStore.getState().setPlacingPin(false);
    if (useDrawingStore.getState().activeBrushId === 'eraser') useDrawingStore.getState().setActiveBrush('pencil');
    useDrawingStore.getState().setDrawingMode(true);
    setOpen(false);
  };
  const share = async () => {
    if (!location) return;
    const url = `${window.location.origin}/canvas?${mapLocationQuery(location)}&via=shared`;
    try {
      if (navigator.share) await navigator.share({ title: 'DrawMaps', url });
      else await navigator.clipboard.writeText(url);
      trackEvent('share'); setCopied(true);
    } catch { /* Dismissing the share sheet is not an error. */ }
  };
  return <aside className="pointer-events-none absolute left-3 top-20 z-20 max-w-[min(320px,calc(100vw-24px))] sm:left-5" aria-label={text('title')}>
    {open ? <section className="pointer-events-auto rounded-3xl border border-white/80 bg-amber-50/95 p-5 shadow-lg backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full bg-amber-200 px-3 py-1 text-[11px] font-bold tracking-wide text-amber-950">YOUR WORLD, YOUR CANVAS</span>
        <button className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-amber-100" aria-label={text('close')} onClick={() => setOpen(false)}><X size={18} /></button>
      </div>
      <h2 className="mt-3 text-xl font-bold tracking-tight text-gray-900">{text('title')}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{text('intro')}</p>
      <button onClick={start} className="mt-4 flex min-h-11 w-full items-center justify-between rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><span className="flex items-center gap-2"><Pencil size={16} />{text('start')}</span><ArrowUpRight size={18} /></button>
      <div className="mt-3 flex gap-2" aria-label={text('explore')}>
        {[['北京', 116.4074, 39.9042], ['Paris', 2.2945, 48.8584], ['東京', 139.7671, 35.6812]].map(([name, lng, lat]) => <button key={name} className="min-h-10 flex-1 rounded-full bg-white px-2 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:ring-violet-400" onClick={() => window.dispatchEvent(new CustomEvent('map:visit', { detail: { lng, lat, zoom: 18 } }))}>{name}</button>)}
      </div>
    </section> : <button onClick={() => setOpen(true)} className="liquid-glass pointer-events-auto flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-violet-950"><Compass size={16} />{text('explore')}</button>}
    <div className="liquid-glass pointer-events-auto mt-2 rounded-2xl px-4 py-3 text-xs leading-relaxed text-gray-800">
      {!user ? <button className="text-left" onClick={onLogin}>{text('preview')}</button> : <>
        <p role="status" className="flex items-center gap-2"><Check size={14} />{text(state === 'connected' ? 'saved' : state === 'connecting' ? 'saving' : state === 'error' ? 'error' : 'pending')}</p>
        {hasPractice && <button className="mt-1 min-h-9 text-violet-700 underline underline-offset-2" onClick={() => window.dispatchEvent(new Event('map:publish-practice'))}>{text('publish')}</button>}
      </>}
      {limited && <p role="status" className="mt-2 text-amber-800">{text('dense')}</p>}
      <button onClick={share} className="mt-1 flex min-h-10 items-center gap-2 font-semibold text-violet-800"><Share2 size={14} />{copied ? text('copied') : text('share')}</button>
    </div>
  </aside>;
}
