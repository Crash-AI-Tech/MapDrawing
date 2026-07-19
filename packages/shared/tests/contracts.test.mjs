import assert from 'node:assert/strict';
import test from 'node:test';
import shared from '../dist/index.js';

const {
  BRUSH_IDS,
  classifyHttpFailure,
  isSupportedBrushId,
  parseOfflineQueue,
  calculateInkSegmentCost,
  calculateStrokeInkCost,
  regenerateInk,
  tileKeysForBounds,
  parseTileKey,
  dedupeById,
} = shared;

const stroke = {
  id: 'stroke-1',
  userId: 'user-1',
  userName: 'Tester',
  brushId: BRUSH_IDS.PENCIL,
  color: '#000000',
  opacity: 1,
  size: 2,
  points: [
    { x: 116.4, y: 39.9, pressure: 0.5, timestamp: 1 },
    { x: 116.40001, y: 39.90001, pressure: 0.5, timestamp: 2 },
  ],
  bounds: { minLng: 116.4, maxLng: 116.40001, minLat: 39.9, maxLat: 39.90001 },
  createdZoom: 18,
  createdAt: 1,
};

test('only server-supported brushes are exposed', () => {
  assert.deepEqual(Object.values(BRUSH_IDS), ['pencil', 'eraser']);
  assert.equal(isSupportedBrushId('pencil'), true);
  assert.equal(isSupportedBrushId('spray'), false);
});

test('HTTP retry classification is identical across clients', () => {
  assert.equal(classifyHttpFailure(401), 'auth');
  assert.equal(classifyHttpFailure(402), 'permanent');
  assert.equal(classifyHttpFailure(422), 'permanent');
  assert.equal(classifyHttpFailure(408), 'retry');
  assert.equal(classifyHttpFailure(429), 'retry');
  assert.equal(classifyHttpFailure(503), 'retry');
});

test('offline queue accepts only the current v2 contract', () => {
  const event = { type: 'STROKE_ADD', stroke };
  const queue = parseOfflineQueue([
    event,
    { version: 1, id: 'v1-old', event, createdAt: 900, attempts: 0 },
    { version: 2, id: 'current', event, createdAt: 950, attempts: 0 },
    { version: 2, id: 'legacy-brush', event: { ...event, stroke: { ...stroke, brushId: 'spray' } }, createdAt: 960, attempts: 0 },
  ], 1000);

  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, 'current');
  assert.equal(queue[0].version, 2);
});

test('ink rules use the same constants for preview and server validation', () => {
  assert.equal(calculateInkSegmentCost(2, 100, 18), 10);
  assert.equal(calculateInkSegmentCost(2, 100, 19), 2.5);
  assert.equal(regenerateInk(90, 180_000), 100);
  assert.ok(calculateStrokeInkCost(stroke.points, stroke.size, 18) >= 0.05);
});

test('tile planning and dedupe are deterministic', () => {
  const keys = tileKeysForBounds(stroke.bounds);
  assert.ok(keys.length > 0);
  assert.ok(parseTileKey(keys[0]));
  assert.deepEqual(dedupeById([[stroke], [{ ...stroke, color: '#FFFFFF' }]]), [
    { ...stroke, color: '#FFFFFF' },
  ]);
});
