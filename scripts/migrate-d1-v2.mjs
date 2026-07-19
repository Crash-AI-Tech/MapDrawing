#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const source = valueOf('--source');
const target = valueOf('--target');
const config = valueOf('--config', 'web/wrangler.toml');
const apply = args.includes('--apply');

if (!source || !target) {
  console.error('Usage: node scripts/migrate-d1-v2.mjs --source <db> --target <db> [--config web/wrangler.toml] [--apply]');
  process.exit(2);
}
if (source === target) {
  console.error('Source and target databases must be different.');
  process.exit(2);
}

function wrangler(...commandArgs) {
  return execFileSync('pnpm', ['exec', 'wrangler', ...commandArgs, '--config', config], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function query(database, sql) {
  const raw = wrangler('d1', 'execute', database, '--remote', '--json', '--command', sql);
  const payload = JSON.parse(raw);
  const result = Array.isArray(payload) ? payload[0] : payload;
  return result?.results ?? result?.result?.[0]?.results ?? [];
}

function sqlValue(value) {
  if (value == null) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot encode non-finite number');
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

const users = query(source, `SELECT id, email, user_name, password_hash, apple_id,
  email_verified, avatar_url, created_at, updated_at FROM users ORDER BY id`);
const nowSeconds = Math.floor(Date.now() / 1000);
const sessions = query(source, `SELECT id, user_id, expires_at FROM sessions
  WHERE expires_at > ${nowSeconds} ORDER BY id`);

console.log(`D1 v2 migration plan: ${users.length} users, ${sessions.length} active sessions.`);
console.log('Drawings, pins, reports, blocks, verification codes, ink balances, and rate limits will not be copied.');

if (!apply) {
  console.log('Dry run only. Re-run with --apply after creating an empty target D1 database.');
  process.exit(0);
}

wrangler('d1', 'migrations', 'apply', target, '--remote');

const statements = ['PRAGMA foreign_keys = ON;'];
for (const user of users) {
  statements.push(`INSERT INTO users (
    id, email, user_name, password_hash, apple_id, apple_refresh_token,
    email_verified, avatar_url, created_at, updated_at
  ) VALUES (${[
    user.id, user.email, user.user_name, user.password_hash, user.apple_id, null,
    Number(user.email_verified) ? 1 : 0, user.avatar_url, user.created_at, user.updated_at,
  ].map(sqlValue).join(', ')});`);
  statements.push(`INSERT INTO user_ink (user_id, ink, updated_at) VALUES (${sqlValue(user.id)}, 100, ${nowSeconds});`);
}
for (const session of sessions) {
  statements.push(`INSERT INTO sessions (id, user_id, expires_at) VALUES (${[
    session.id, session.user_id, session.expires_at,
  ].map(sqlValue).join(', ')});`);
}

const tempDirectory = mkdtempSync(join(tmpdir(), 'drawmaps-d1-v2-'));
const importFile = join(tempDirectory, 'users-and-sessions.sql');
try {
  writeFileSync(importFile, `${statements.join('\n')}\n`, { mode: 0o600 });
  wrangler('d1', 'execute', target, '--remote', '--file', importFile);
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}

const targetCounts = query(target, `SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM sessions) AS sessions,
  (SELECT COUNT(*) FROM drawings) AS drawings,
  (SELECT COUNT(*) FROM map_pins) AS pins`)[0];

if (Number(targetCounts?.users) !== users.length || Number(targetCounts?.sessions) !== sessions.length) {
  throw new Error('Target validation failed: user or session counts do not match.');
}
if (Number(targetCounts?.drawings) !== 0 || Number(targetCounts?.pins) !== 0) {
  throw new Error('Target validation failed: the v2 content tables were expected to be empty.');
}

console.log(`Migration complete: ${targetCounts.users} users and ${targetCounts.sessions} active sessions validated.`);
