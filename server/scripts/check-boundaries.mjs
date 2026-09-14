#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const failures = [];

async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await sourceFiles(path));
    else if (['.ts', '.tsx', '.js', '.mjs'].includes(extname(entry.name))) result.push(path);
  }
  return result;
}

async function reject(directory, patterns, allow = () => false) {
  for (const file of await sourceFiles(directory)) {
    if (allow(file)) continue;
    const source = await readFile(file, 'utf8');
    for (const [pattern, explanation] of patterns) {
      if (pattern.test(source)) failures.push(`${relative(root, file)}: ${explanation}`);
    }
  }
}

await reject(join(root, 'ios'), [
  [/@mapdrawing\/server/, 'iOS may only import @mapdrawing/contracts'],
  [/\.\.\/web\//, 'iOS must not import Web source'],
]);

await reject(join(root, 'web/src'), [
  [/@mapdrawing\/server/, 'browser-facing Web code must not import server internals'],
], file => file.includes('/app/api/') || file.includes('/app/(auth)/') || file.includes('/app/share/'));

await reject(join(root, 'server/src'), [
  [/from ['"]react(?:-native)?['"]/, 'server code must not depend on React runtimes'],
  [/@\/lib\//, 'server code must not import the Web alias'],
]);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Workspace dependency boundaries are valid.');
