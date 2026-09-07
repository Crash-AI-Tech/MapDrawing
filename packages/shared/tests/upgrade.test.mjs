import assert from 'node:assert/strict';
import test from 'node:test';
import shared from '../dist/index.js';
const { ViewportTileLoader, nextWriteBatch, DurableWriter, parseMapLocation, mapLocationQuery, tileToBounds } = shared;
const bounds = { minLng: 116.4, maxLng: 116.40001, minLat: 39.9, maxLat: 39.90001 };
const stroke = (id, points = 2) => ({ id, userId: 'u', userName: 'U', brushId: 'pencil', color: '#000000', opacity: 1, size: 2, points: Array.from({ length: points }, () => ({ x: 116.4, y: 39.9, pressure: 0.5, timestamp: 1 })), bounds, createdAt: 1, createdZoom: 18 });

test('location links validate every coordinate and preserve a round trip', () => {
  assert.equal(parseMapLocation(new URLSearchParams('lng=1&lat=2')), null);
  for (const query of ['lng=Infinity&lat=2&zoom=18', 'lng=1&lat=90&zoom=18', 'lng=1&lat=2&zoom=99', 'lng=&lat=2&zoom=18']) assert.equal(parseMapLocation(new URLSearchParams(query)), null);
  const location = { lng: 116.4, lat: 39.9, zoom: 18 };
  assert.deepEqual(parseMapLocation(new URLSearchParams(mapLocationQuery(location))), location);
});

test('cache returns data on a revisit, not just an empty freshness marker', async () => {
  let calls = 0;
  const loader = new ViewportTileLoader(async () => { calls++; return { items: [stroke('a')], nextCursor: null }; });
  assert.equal((await loader.fetchMissingTiles(bounds))[0].id, 'a');
  assert.equal((await loader.fetchMissingTiles(bounds))[0].id, 'a');
  assert.equal(calls, 1);
});

test('only a complete refreshed snapshot confirms a remote deletion', async () => {
  let calls = 0;
  const loader = new ViewportTileLoader(async () => ({ items: calls++ === 0 ? [stroke('a'), stroke('b')] : [stroke('b')], nextCursor: null }), -1);
  await loader.fetchMissingTiles(bounds);
  await loader.fetchMissingTiles(bounds);
  assert.deepEqual(loader.takeRemovedIds(), ['a']);
  assert.deepEqual(loader.takeRemovedIds(), []);
});

test('pagination resumes without dropping the first page', async () => {
  const loader = new ViewportTileLoader(async (_tile, cursor) => cursor ? { items: [stroke('b')], nextCursor: null } : { items: [stroke('a')], nextCursor: { id: 'a', createdAt: 1 } });
  assert.equal((await loader.fetchMissingTiles(bounds)).length, 1);
  assert.equal(loader.truncated, true);
  assert.equal((await loader.fetchMissingTiles(bounds)).length, 2);
  assert.equal(loader.truncated, false);
});

test('network failure does not mark a tile loaded or confirm deletion', async () => {
  let calls = 0;
  const loader = new ViewportTileLoader(async () => {
    if (!calls++) throw new Error('offline');
    return { items: [stroke('a')], nextCursor: null };
  });
  assert.deepEqual(await loader.fetchMissingTiles(bounds), []);
  assert.deepEqual(loader.takeRemovedIds(), []);
  assert.equal((await loader.fetchMissingTiles(bounds)).length, 1);
});

test('expired partial pages resume and confirm deletion only when fully loaded', async () => {
  let calls = 0;
  const loader = new ViewportTileLoader(async (_tile, cursor) => {
    calls++;
    if (calls === 1) return { items: [stroke('a'), stroke('b'), stroke('removed')], nextCursor: null };
    if (calls === 2) return { items: [stroke('a')], nextCursor: { id: 'a', createdAt: 1 } };
    assert.equal(cursor.id, 'a');
    return { items: [stroke('b')], nextCursor: null };
  }, -1);
  await loader.fetchMissingTiles(bounds);
  await loader.fetchMissingTiles(bounds);
  assert.deepEqual(loader.takeRemovedIds(), []);
  assert.deepEqual((await loader.fetchMissingTiles(bounds)).map(s => s.id), ['a', 'b']);
  assert.deepEqual(loader.takeRemovedIds(), ['removed']);
});

test('evicted tiles are fetched again when revisited', async () => {
  let calls = 0;
  const loader = new ViewportTileLoader(async tile => { calls++; return { items: [stroke(`${tile.x}`)], nextCursor: null }; });
  const at = x => { const b = tileToBounds(x, 8000, 14); return { minLng: (b.minLng + b.maxLng) / 2, maxLng: (b.minLng + b.maxLng) / 2, minLat: (b.minLat + b.maxLat) / 2, maxLat: (b.minLat + b.maxLat) / 2 }; };
  for (let x = 100; x < 170; x++) await loader.fetchMissingTiles(at(x));
  const before = calls;
  assert.equal((await loader.fetchMissingTiles(at(100)))[0].id, '100');
  assert.equal(calls, before + 1);
});

test('tile requests have at most four concurrent fetches', async () => {
  let running = 0, peak = 0;
  const loader = new ViewportTileLoader(async () => {
    running++; peak = Math.max(peak, running);
    await new Promise(resolve => setTimeout(resolve, 2));
    running--; return { items: [], nextCursor: null };
  });
  await loader.fetchMissingTiles({ minLng: 116.4, maxLng: 116.5, minLat: 39.9, maxLat: 40 });
  assert.equal(peak, 4);
});

test('superseded requests cannot overwrite the new viewport result', async () => {
  let release;
  let calls = 0;
  const loader = new ViewportTileLoader(async () => {
    if (!calls++) { await new Promise(resolve => { release = resolve; }); return { items: [stroke('old')], nextCursor: null }; }
    return { items: [stroke('new')], nextCursor: null };
  });
  const first = loader.fetchMissingTiles(bounds);
  const second = await loader.fetchMissingTiles(bounds);
  release();
  assert.deepEqual(await first, []);
  assert.equal(second[0].id, 'new');
  assert.equal((await loader.fetchMissingTiles(bounds))[0].id, 'new');
});

test('point budget limits dense tiles and reports reduced detail', async () => {
  const loader = new ViewportTileLoader(async () => ({ items: Array.from({ length: 200 }, (_, i) => stroke(String(i), 1000)), nextCursor: null }));
  const result = await loader.fetchMissingTiles(bounds);
  assert.ok(result.reduce((n, s) => n + s.points.length, 0) <= 50_000);
  assert.equal(loader.truncated, true);
  assert.deepEqual(loader.takeRemovedIds(), []);
});

test('write batching preserves undo and duplicate-ID boundaries', () => {
  const a = { type: 'STROKE_ADD', stroke: stroke('a') };
  const b = { type: 'STROKE_ADD', stroke: stroke('b') };
  const remove = { type: 'STROKE_DELETE', strokeId: 'a', userId: 'u' };
  assert.deepEqual(nextWriteBatch([a, b, remove, a]), [a, b]);
  assert.deepEqual(nextWriteBatch([remove, a]), [remove]);
  assert.deepEqual(nextWriteBatch([a, a]), [a]);
  assert.equal(nextWriteBatch(Array.from({ length: 20 }, (_, i) => ({ ...a, stroke: stroke(String(i)) }))).length, 8);
});

test('durable writer batches saves before deleting and drains the persisted queue', async () => {
  let events = [];
  const calls = [];
  const queue = { enqueue: async e => { events.push(e); }, peek: async () => [...events], removeProcessed: async n => { events = events.slice(n); } };
  const writer = new DurableWriter({ queue, save: async strokes => { calls.push(strokes.map(s => s.id)); return { ok: true, count: strokes.length }; }, remove: async id => { calls.push(`delete:${id}`); }, retryable: () => false });
  try {
    await writer.enqueue({ type: 'STROKE_ADD', stroke: stroke('a') });
    await writer.enqueue({ type: 'STROKE_ADD', stroke: stroke('b') });
    await writer.enqueue({ type: 'STROKE_DELETE', strokeId: 'a', userId: 'u' });
    await new Promise(resolve => setTimeout(resolve, 800));
    assert.deepEqual(calls, [['a', 'b'], 'delete:a']);
    assert.deepEqual(events, []);
    assert.equal(writer.getState(), 'connected');
  } finally { writer.dispose(); }
});

test('tile utilities remain available for capacity fixtures', () => { assert.ok(tileToBounds(0, 0, 14).minLng === -180); });

test('expired authentication preserves durable writes instead of discarding them', async () => {
  let events = [];
  const writer = new DurableWriter({
    queue: { enqueue: async e => { events.push(e); }, peek: async () => [...events], removeProcessed: async n => { events = events.slice(n); } },
    save: async () => { throw { status: 401 }; }, remove: async () => undefined,
    retryable: () => false, authBlocked: error => error.status === 401,
  });
  try {
    await writer.enqueue({ type: 'STROKE_ADD', stroke: stroke('a') });
    await new Promise(resolve => setTimeout(resolve, 800));
    assert.equal(events.length, 1);
    assert.equal(writer.getState(), 'error');
  } finally { writer.dispose(); }
});

test('a rejected batch falls back to individual strokes without losing valid neighbors', async () => {
  let events = [], rejected = [], saved = [];
  const writer = new DurableWriter({
    queue: { enqueue: async e => { events.push(e); }, peek: async () => [...events], removeProcessed: async n => { events = events.slice(n); } },
    save: async strokes => {
      if (strokes.some(s => s.id === 'bad')) throw { status: 400 };
      saved.push(...strokes.map(s => s.id)); return { ok: true, count: strokes.length };
    }, remove: async () => undefined, retryable: () => false, onRejected: id => rejected.push(id),
  });
  try {
    await writer.enqueue({ type: 'STROKE_ADD', stroke: stroke('bad') });
    await writer.enqueue({ type: 'STROKE_ADD', stroke: stroke('good') });
    await new Promise(resolve => setTimeout(resolve, 800));
    assert.deepEqual(rejected, ['bad']); assert.deepEqual(saved, ['good']); assert.equal(events.length, 0);
    assert.equal(writer.getState(), 'error');
  } finally { writer.dispose(); }
});
