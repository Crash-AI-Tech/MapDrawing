#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const configPath = process.argv[2];
if (!configPath) {
  console.error('Usage: node scripts/assert-d1-v2-target.mjs <wrangler-config>');
  process.exit(2);
}

const absolutePath = resolve(process.cwd(), configPath);
const source = await readFile(absolutePath, 'utf8');
const databaseName = source.match(/^database_name\s*=\s*"([^"]+)"/m)?.[1];
const databaseId = source.match(/^database_id\s*=\s*"([^"]+)"/m)?.[1];

if (!databaseName || !databaseId) {
  console.error(`Missing D1 database_name or database_id in ${absolutePath}`);
  process.exit(1);
}

if (!databaseName.endsWith('-v2')) {
  console.error(
    `Refusing remote release: ${databaseName} is not a v2 D1 target. ` +
    'Create and migrate a new *-v2 database, then update the Wrangler config.'
  );
  process.exit(1);
}

console.log(`D1 release target verified: ${databaseName} (${databaseId})`);
