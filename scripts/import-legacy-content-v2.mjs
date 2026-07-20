#!/usr/bin/env node

/**
 * One-time migration for legacy public content. This intentionally leaves
 * application code untouched and imports only drawings and pins into an empty
 * v2 content target. Users must already exist in the target database.
 *
 * Usage:
 *   node scripts/import-legacy-content-v2.mjs --source map-db --target map-db-v2
 *   node scripts/import-legacy-content-v2.mjs --source map-db --target map-db-v2 --apply
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const source = valueOf('--source');
const target = valueOf('--target');
const config = resolve(valueOf('--config', 'web/wrangler.toml'));
const apply = args.includes('--apply');
const TILE_ZOOM = 14;
const MAX_TILES_PER_DRAWING = 16;
const VALID_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const VALID_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_MERCATOR_LAT = 85.05112878;

if (!source || !target || source === target) {
  console.error('Usage: node scripts/import-legacy-content-v2.mjs --source <db> --target <db> [--config web/wrangler.toml] [--apply]');
  process.exit(2);
}

function runWrangler(configPath, ...commandArgs) {
  return execFileSync('pnpm', ['exec', 'wrangler', ...commandArgs, '--config', configPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const configuredAccountId = readFileSync(config, 'utf8')
  .match(/^account_id\s*=\s*"([^"]+)"/m)?.[1];
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || configuredAccountId;
if (!accountId) throw new Error(`Could not resolve account_id from ${config}`);

const databases = JSON.parse(runWrangler(config, 'd1', 'list', '--json'));
const sourceDatabase = databases.find((database) => database.name === source);
const targetDatabase = databases.find((database) => database.name === target);
if (!sourceDatabase || !targetDatabase) throw new Error('Source or target D1 database was not found.');

function tomlString(value) {
  return `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'drawmaps-content-import-'));
const temporaryConfig = join(temporaryDirectory, 'wrangler.toml');
writeFileSync(temporaryConfig, `name = "drawmaps-content-import"
account_id = ${tomlString(accountId)}
compatibility_date = "2025-12-01"

[[d1_databases]]
binding = "SOURCE_DB"
database_name = ${tomlString(sourceDatabase.name)}
database_id = ${tomlString(sourceDatabase.uuid)}

[[d1_databases]]
binding = "TARGET_DB"
database_name = ${tomlString(targetDatabase.name)}
database_id = ${tomlString(targetDatabase.uuid)}
`, { mode: 0o600 });
process.on('exit', () => rmSync(temporaryDirectory, { recursive: true, force: true }));

function wrangler(...commandArgs) {
  return runWrangler(temporaryConfig, ...commandArgs);
}

function query(database, sql) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const raw = wrangler('d1', 'execute', database, '--remote', '--json', '--command', sql);
      const payload = JSON.parse(raw);
      const result = Array.isArray(payload) ? payload[0] : payload;
      return result?.results ?? result?.result?.[0]?.results ?? [];
    } catch (error) {
      lastError = error;
      if (attempt < 3) console.warn(`D1 query attempt ${attempt} failed; retrying.`);
    }
  }
  throw lastError;
}

function sqlValue(value) {
  if (value == null) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot encode a non-finite number.');
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function number(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be finite.`);
  return parsed;
}

function normalizePoint(value, drawingId, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Drawing ${drawingId} point ${index} is not an object.`);
  }
  const input = value;
  const x = number(input.x, `Drawing ${drawingId} point ${index}.x`);
  const y = number(input.y, `Drawing ${drawingId} point ${index}.y`);
  const pressure = number(input.pressure ?? 0.5, `Drawing ${drawingId} point ${index}.pressure`);
  const timestamp = Math.trunc(number(input.timestamp ?? 0, `Drawing ${drawingId} point ${index}.timestamp`));
  if (x < -180 || x > 180 || y < -MAX_MERCATOR_LAT || y > MAX_MERCATOR_LAT || pressure < 0 || pressure > 1 || timestamp < 0) {
    throw new Error(`Drawing ${drawingId} point ${index} is outside v2 limits.`);
  }
  return { x, y, pressure, timestamp };
}

function tilesForBounds(bounds) {
  const tileCount = 2 ** TILE_ZOOM;
  const toTile = (lat, lng) => {
    const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
    const clampedLng = Math.max(-180, Math.min(180 - Number.EPSILON, lng));
    const x = Math.floor(((clampedLng + 180) / 360) * tileCount);
    const latRadians = (clampedLat * Math.PI) / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2 * tileCount);
    return { x: Math.max(0, Math.min(tileCount - 1, x)), y: Math.max(0, Math.min(tileCount - 1, y)) };
  };
  const topLeft = toTile(bounds.maxLat, bounds.minLng);
  const bottomRight = toTile(bounds.minLat, bounds.maxLng);
  const count = (bottomRight.x - topLeft.x + 1) * (bottomRight.y - topLeft.y + 1);
  if (count > MAX_TILES_PER_DRAWING) throw new Error(`Drawing spans ${count} tiles; limit is ${MAX_TILES_PER_DRAWING}.`);
  const tiles = [];
  for (let x = topLeft.x; x <= bottomRight.x; x += 1) {
    for (let y = topLeft.y; y <= bottomRight.y; y += 1) tiles.push({ z: TILE_ZOOM, x, y });
  }
  return tiles;
}

const targetCounts = query('TARGET_DB', `SELECT
  (SELECT COUNT(*) FROM drawings) AS drawings,
  (SELECT COUNT(*) FROM drawing_tiles) AS drawing_tiles,
  (SELECT COUNT(*) FROM map_pins) AS pins`)[0];
if (Number(targetCounts?.drawings) !== 0 || Number(targetCounts?.drawing_tiles) !== 0 || Number(targetCounts?.pins) !== 0) {
  throw new Error('Target content tables are not empty; refusing to overwrite or merge legacy content.');
}

const targetUsers = new Set(query('TARGET_DB', 'SELECT id FROM users').map((row) => row.id));
const legacyDrawings = query('SOURCE_DB', `SELECT id, user_id, user_name, brush_id, color, opacity, size, points,
  created_zoom, meta, created_at, updated_at FROM drawings ORDER BY created_at, id`);
const legacyPins = query('SOURCE_DB', `SELECT id, user_id, user_name, lng, lat, message, color, created_at, updated_at
  FROM map_pins ORDER BY created_at, id`);

const drawings = legacyDrawings.map((row) => {
  if (!VALID_ID.test(row.id) || !targetUsers.has(row.user_id)) throw new Error(`Drawing ${row.id} has no target user.`);
  const brushId = row.brush_id === 'highlighter' ? 'pencil' : row.brush_id;
  if (brushId !== 'pencil' && brushId !== 'eraser') throw new Error(`Drawing ${row.id} has unsupported brush ${row.brush_id}.`);
  if (typeof row.color !== 'string' || !VALID_COLOR.test(row.color)) throw new Error(`Drawing ${row.id} has an invalid color.`);
  const opacity = number(row.opacity, `Drawing ${row.id} opacity`);
  const size = number(row.size, `Drawing ${row.id} size`);
  const createdZoom = number(row.created_zoom, `Drawing ${row.id} zoom`);
  if (opacity < 0.05 || opacity > 1 || size < 0.5 || size > 10 || createdZoom < 18 || createdZoom > 22) {
    throw new Error(`Drawing ${row.id} is outside v2 brush limits.`);
  }
  const rawPoints = JSON.parse(row.points);
  if (!Array.isArray(rawPoints) || rawPoints.length < 2 || rawPoints.length > 1000) throw new Error(`Drawing ${row.id} has invalid point count.`);
  const points = rawPoints.map((point, index) => normalizePoint(point, row.id, index));
  const bounds = points.reduce((result, point) => ({
    minLng: Math.min(result.minLng, point.x), maxLng: Math.max(result.maxLng, point.x),
    minLat: Math.min(result.minLat, point.y), maxLat: Math.max(result.maxLat, point.y),
  }), { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity });
  if (bounds.maxLng - bounds.minLng > 1 || bounds.maxLat - bounds.minLat > 1) throw new Error(`Drawing ${row.id} spans too far.`);
  const meta = row.meta == null ? null : JSON.parse(row.meta);
  if (meta != null && (typeof meta !== 'object' || Array.isArray(meta))) throw new Error(`Drawing ${row.id} has invalid meta.`);
  return {
    id: row.id, userId: row.user_id, userName: row.user_name, brushId, color: row.color.toUpperCase(), opacity, size,
    points: JSON.stringify(points), pointCount: points.length, bounds, createdZoom, meta: meta == null ? null : JSON.stringify(meta),
    createdAtMs: Math.trunc(number(row.created_at, `Drawing ${row.id} created_at`) * 1000),
    updatedAtMs: Math.trunc(number(row.updated_at, `Drawing ${row.id} updated_at`) * 1000),
    tiles: tilesForBounds(bounds),
  };
});

const pins = legacyPins.map((row) => {
  if (!VALID_ID.test(row.id) || !targetUsers.has(row.user_id)) throw new Error(`Pin ${row.id} has no target user.`);
  const lng = number(row.lng, `Pin ${row.id} lng`);
  const lat = number(row.lat, `Pin ${row.id} lat`);
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90 || typeof row.message !== 'string' || row.message.length < 1 || row.message.length > 50) {
    throw new Error(`Pin ${row.id} is outside v2 limits.`);
  }
  return {
    id: row.id, userId: row.user_id, userName: row.user_name, lng, lat, message: row.message, color: row.color,
    createdAtMs: Math.trunc(number(row.created_at, `Pin ${row.id} created_at`) * 1000),
    updatedAtMs: Math.trunc(number(row.updated_at, `Pin ${row.id} updated_at`) * 1000),
  };
});

const tileCount = drawings.reduce((sum, drawing) => sum + drawing.tiles.length, 0);
console.log(`Legacy content plan: ${drawings.length} drawings, ${pins.length} pins, ${tileCount} tile index rows.`);
console.log(`${legacyDrawings.filter((row) => row.brush_id === 'highlighter').length} legacy highlighter drawing(s) will be represented as pencil.`);
if (!apply) {
  console.log('Dry run only. Re-run with --apply to import into the confirmed-empty target content tables.');
  process.exit(0);
}

// Remote D1 SQL-file imports are atomic at the Wrangler layer and reject
// explicit BEGIN/COMMIT statements. Keep the import as one file so a failed
// upload leaves the target unchanged.
const statements = ['PRAGMA foreign_keys = ON;'];
for (const drawing of drawings) {
  statements.push(`INSERT INTO drawings (id, user_id, user_name, brush_id, color, opacity, size, points, point_count, min_lat, max_lat, min_lng, max_lng, created_zoom, meta, created_at_ms, updated_at_ms) VALUES (${[
    drawing.id, drawing.userId, drawing.userName, drawing.brushId, drawing.color, drawing.opacity, drawing.size,
    drawing.points, drawing.pointCount, drawing.bounds.minLat, drawing.bounds.maxLat, drawing.bounds.minLng, drawing.bounds.maxLng,
    drawing.createdZoom, drawing.meta, drawing.createdAtMs, drawing.updatedAtMs,
  ].map(sqlValue).join(', ')});`);
  for (const tile of drawing.tiles) {
    statements.push(`INSERT INTO drawing_tiles (z, x, y, drawing_id, created_at_ms) VALUES (${[
      tile.z, tile.x, tile.y, drawing.id, drawing.createdAtMs,
    ].map(sqlValue).join(', ')});`);
  }
}
for (const pin of pins) {
  statements.push(`INSERT INTO map_pins (id, user_id, user_name, lng, lat, message, color, created_at_ms, updated_at_ms) VALUES (${[
    pin.id, pin.userId, pin.userName, pin.lng, pin.lat, pin.message, pin.color, pin.createdAtMs, pin.updatedAtMs,
  ].map(sqlValue).join(', ')});`);
}
const importFile = join(temporaryDirectory, 'legacy-content.sql');
writeFileSync(importFile, `${statements.join('\n')}\n`, { mode: 0o600 });
wrangler('d1', 'execute', 'TARGET_DB', '--remote', '--file', importFile);

const finalCounts = query('TARGET_DB', `SELECT
  (SELECT COUNT(*) FROM drawings) AS drawings,
  (SELECT COUNT(*) FROM drawing_tiles) AS drawing_tiles,
  (SELECT COUNT(*) FROM map_pins) AS pins`)[0];
if (Number(finalCounts?.drawings) !== drawings.length || Number(finalCounts?.drawing_tiles) !== tileCount || Number(finalCounts?.pins) !== pins.length) {
  throw new Error('Post-import validation failed: target counts do not match the migration plan.');
}
console.log(`Import complete: ${finalCounts.drawings} drawings, ${finalCounts.pins} pins, ${finalCounts.drawing_tiles} tile index rows.`);
