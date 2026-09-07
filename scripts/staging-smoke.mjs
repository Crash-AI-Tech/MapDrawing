import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import shared from '../packages/shared/dist/index.js';

// Deliberately fixed targets: this test can never create/delete production data.
const origin = 'https://map-staging.privacy2privacy.workers.dev';
const db = 'b6d8b429-8e17-43db-afb1-48b3b35f3bab';
const account = '97c791889a9678820bdb511581c1635b';
const run = `smoke-${randomUUID()}`;
const user = run;
const session = randomUUID().replaceAll('-', '');
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error('Load private Cloudflare credentials before this staging-only test');

async function sql(query, params = []) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${db}/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: query, params }),
  });
  const body = await response.json();
  assert.equal(body.success, true, JSON.stringify(body.errors));
  return body.result[0].results;
}
async function api(endpoint, options = {}) {
  return fetch(origin + endpoint, { ...options, headers: { Authorization: `Bearer ${session}`, 'X-Map-User': user, 'Content-Type': 'application/json', ...options.headers } });
}
const location = { x: 0.12345, y: 0.23456 };
const stroke = suffix => ({ id: `${run}-${suffix}`, userId: user, userName: 'Staging smoke test', brushId: 'pencil', color: '#7C3AED', size: 1, opacity: 1, createdZoom: 18, points: [{ ...location, pressure: 0.5, timestamp: 1 }, { x: location.x + 0.000001, y: location.y, pressure: 0.5, timestamp: 2 }], createdAt: Date.now() });
const tile = shared.getTileKey(location.y, location.x).split('/');
const tileUrl = `/api/drawings/tile?z=${tile[0]}&x=${tile[1]}&y=${tile[2]}&limit=200`;
const send = strokes => api('/api/drawings', { method: 'POST', body: JSON.stringify(strokes) });

try {
  await sql('INSERT INTO users (id,email,user_name,password_hash,email_verified) VALUES (?,?,?,?,1)', [user, `${run}@example.invalid`, run, 'not-a-login-password']);
  await sql('INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)', [session, user, Math.floor(Date.now() / 1000) + 3600]);
  assert.equal((await api('/api/profile')).status, 200, 'fixture authentication');
  assert.equal((await send([stroke('a'), stroke('b')])).status, 201, 'batch save');
  const partial = await send([stroke('a'), stroke('c')]);
  assert.equal(partial.status, 201, 'partially committed batch retry');
  assert.equal((await partial.json()).count, 1, 'only new stroke written');
  const wrongIdentity = await api('/api/drawings', { method: 'POST', headers: { 'X-Map-User': 'another-user' }, body: JSON.stringify([stroke('wrong')]) });
  assert.equal(wrongIdentity.status, 401, 'account switch cannot replay old writes');
  const page = await api(tileUrl);
  assert.equal(page.status, 200);
  const etag = page.headers.get('etag');
  assert.ok(etag);
  assert.equal((await page.json()).items.filter(s => s.id.startsWith(run)).length, 3);
  assert.equal((await api(tileUrl, { headers: { 'If-None-Match': etag } })).status, 304);
  assert.equal((await api(`/api/drawings/${run}-b`, { method: 'DELETE' })).status, 200);
  const after = await api(tileUrl, { headers: { 'If-None-Match': etag } });
  assert.equal(after.status, 200, 'deletion invalidates tile version');
  assert.equal((await after.json()).items.some(s => s.id === `${run}-b`), false);
  const pin = await api('/api/pins', { method: 'POST', body: JSON.stringify({ lng: location.x, lat: location.y, message: run, color: '#7C3AED' }) });
  assert.equal(pin.status, 201, 'pin save');
  const bounds = `minLng=0.12&maxLng=0.13&minLat=0.23&maxLat=0.24`;
  const clustered = await (await api(`/api/pins?${bounds}&zoom=20`)).json();
  assert.equal(clustered.mode, 'clustered');
  assert.ok(clustered.items.some(i => i.type === 'cluster' && i.count >= 1));
  const raw = await (await api(`/api/pins?${bounds}&zoom=21`)).json();
  assert.ok(raw.items.some(i => i.message === run));
  assert.equal((await api('/api/events', { method: 'POST', body: JSON.stringify({ event: 'canvas_open', platform: 'web', channel: 'direct' }) })).status, 204);
  const activity = await sql('SELECT event FROM product_activity WHERE user_id=?', [user]);
  assert.deepEqual(activity.map(i => i.event).sort(), ['create', 'visit']);
  for (let attempt = 0; attempt < 6; attempt++) {
    const verify = await api('/api/auth/mobile/verify', { method: 'POST', body: JSON.stringify({ email: `${run}@example.invalid`, code: '000000' }) });
    assert.equal(verify.status, attempt < 5 ? 400 : 429, 'verification attempts have an atomic shared limit');
  }
  for (const route of ['/', '/canvas', '/legal/privacy', '/en', '/zh-cn', '/ja']) assert.equal((await fetch(origin + route)).status, 200, route);
  console.log('PASS: staging auth, batched saves, partial retry, identity guard, tile ETag/deletion, pin clusters/raw, metrics and public pages');
} finally {
  // Exact run-specific fixture only. Existing staging users/content are untouched.
  await sql('DELETE FROM users WHERE id=?', [user]);
  const residue = await sql('SELECT count(*) AS n FROM product_activity WHERE user_id=?', [user]);
  assert.equal(residue[0].n, 0, 'account deletion removes linked metrics');
  console.log('Removed this run’s temporary staging account/session/content; no production data was touched.');
}
