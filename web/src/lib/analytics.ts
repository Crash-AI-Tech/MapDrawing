import type { ProductEvent } from '@niubi/shared';
const sent = new Set<string>();
export function trackEvent(event: ProductEvent, identity = 'guest'): void {
  if (typeof window === 'undefined' || navigator.doNotTrack === '1') return;
  // At most one of each lifecycle event per page, never pointer/stroke telemetry.
  const key = `${new Date().toISOString().slice(0, 10)}:${identity}:${event}`;
  if (sent.has(key)) return;
  sent.add(key);
  const channel = new URLSearchParams(location.search).get('via') ?? 'direct';
  void fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, channel, platform: 'web' }), keepalive: true }).then(response => { if (!response.ok) sent.delete(key); }).catch(() => sent.delete(key));
}
