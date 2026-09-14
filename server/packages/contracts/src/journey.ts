import type { AppLanguage } from './protocol';

export const journeyCopy = {
  title: { zh: '给这个地方，留一点想象', en: 'Leave a little imagination here', ja: 'この場所に、想像をひとつ' },
  intro: { zh: '选一处地方，画一笔，再邀请朋友接着画。', en: 'Find a place, make a mark, invite a friend.', ja: '場所を選び、描いて、友だちを招待。' },
  start: { zh: '在这里画一笔', en: 'Draw here', ja: 'ここに描く' },
  explore: { zh: '寻找创作地点', en: 'Find a place', ja: '場所を探す' },
  share: { zh: '邀请朋友到这里', en: 'Invite a friend here', ja: 'ここに友だちを招待' },
  preview: { zh: '试画仅保存在本次页面中。登录后可发布到公开地图。', en: 'Practice stays in this screen. Sign in to publish to the public map.', ja: 'お試し描画はこの画面内のみ。ログインして公開できます。' },
  publish: { zh: '发布我的试画', en: 'Publish my practice', ja: 'お試し描画を公開' },
  saved: { zh: '已保存', en: 'Saved', ja: '保存済み' },
  saving: { zh: '正在保存…', en: 'Saving…', ja: '保存中…' },
  pending: { zh: '等待同步，请保留此设备', en: 'Waiting to sync on this device', ja: 'この端末で同期待ち' },
  error: { zh: '部分操作未保存，请检查登录或墨水', en: 'Some changes were not saved. Check sign-in or ink.', ja: '未保存の操作があります。ログインとインクをご確認ください。' },
  dense: { zh: '此区域内容较多，正在分批加载；放大查看细节', en: 'Loading a busy area in stages. Zoom in for detail.', ja: '順次読み込み中。拡大すると詳細を見られます。' },
  close: { zh: '收起提示', en: 'Dismiss guide', ja: 'ガイドを閉じる' },
  copied: { zh: '地点链接已复制', en: 'Place link copied', ja: '場所のリンクをコピーしました' },
} as const;
export function journeyText(key: keyof typeof journeyCopy, lang: AppLanguage): string { return journeyCopy[key][lang]; }

export interface MapLocation { lng: number; lat: number; zoom: number }
export function parseMapLocation(params: { get(name: string): string | null }): MapLocation | null {
  const raw = ['lng', 'lat', 'zoom'].map(k => params.get(k));
  if (raw.some(v => v === null || v.trim() === '')) return null;
  const [lng, lat, zoom] = raw.map(Number);
  if (![lng, lat, zoom].every(Number.isFinite) || Math.abs(lng) > 180 || Math.abs(lat) > 85.05112878 || zoom < 1 || zoom > 22) return null;
  return { lng, lat, zoom };
}
export function mapLocationQuery(location: MapLocation): string {
  return `lng=${location.lng.toFixed(6)}&lat=${location.lat.toFixed(6)}&zoom=${location.zoom.toFixed(2)}`;
}

export const PRODUCT_EVENTS = ['canvas_open', 'tool_try', 'signup_start', 'share'] as const;
export type ProductEvent = typeof PRODUCT_EVENTS[number];
