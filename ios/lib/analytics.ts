import type { ProductEvent } from '@niubi/shared';
import { apiFetch } from './api';
const sent = new Set<string>();
export function trackEvent(event: ProductEvent, identity = 'guest'): void {
  const key = `${new Date().toISOString().slice(0, 10)}:${identity}:${event}`;
  if (sent.has(key)) return;
  sent.add(key);
  void apiFetch('/api/events', { method: 'POST', auth: true, silent: true, body: JSON.stringify({ event, platform: 'ios' }) }).catch(() => sent.delete(key));
}
