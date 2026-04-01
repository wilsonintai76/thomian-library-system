#!/usr/bin/env node
// Bumps the patch version in all 4 package.json files atomically.
// Also updates CACHE_NAME in admin/public/sw.js and kiosk/public/sw.js so the
// browser always detects sw.js as changed and fires the update notification.
// Usage:  node bump.mjs
//         node bump.mjs minor
//         node bump.mjs major

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = [
  join(__dirname, 'package.json'),
  join(__dirname, 'admin', 'package.json'),
  join(__dirname, 'kiosk', 'package.json'),
  join(__dirname, 'backend', 'package.json'),
];

const bump = process.argv[2] ?? 'patch'; // patch | minor | major

const root = JSON.parse(readFileSync(files[0], 'utf8'));
let [major, minor, patch] = root.version.split('.').map(Number);

if (bump === 'major') { major++; minor = 0; patch = 0; }
else if (bump === 'minor') { minor++; patch = 0; }
else { patch++; }

const newVersion = `${major}.${minor}.${patch}`;

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  pkg.version = newVersion;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ✓ ${file.replace(__dirname, '.').replace(/\\/g, '/')} → ${newVersion}`);
}

// Update CACHE_NAME in both service workers so the browser always detects a
// changed sw.js file and fires the update/install flow.
const swFiles = [
  join(__dirname, 'admin', 'public', 'sw.js'),
  join(__dirname, 'kiosk', 'public', 'sw.js'),
];
for (const swFile of swFiles) {
  let src = readFileSync(swFile, 'utf8');
  src = src.replace(/const CACHE_NAME = 'thomian-lib-v[^']+';/, `const CACHE_NAME = 'thomian-lib-v${newVersion}';`);
  writeFileSync(swFile, src);
  console.log(`  ✓ ${swFile.replace(__dirname, '.').replace(/\\/g, '/')} → CACHE_NAME thomian-lib-v${newVersion}`);
}

console.log(`\nBumped to v${newVersion}`);
