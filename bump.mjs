#!/usr/bin/env node
// Bumps the patch version in all 4 package.json files atomically.
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

console.log(`\nBumped to v${newVersion}`);
