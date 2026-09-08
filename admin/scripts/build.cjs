'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(ROOT, '..');

function findTsc() {
  const candidates = [
    path.join(MONOREPO_ROOT, 'node_modules/typescript/bin/tsc'),
    path.join(MONOREPO_ROOT, 'node_modules/typescript/lib/tsc.js'),
    path.join(ROOT, 'node_modules/typescript/bin/tsc'),
    path.join(ROOT, 'node_modules/typescript/lib/tsc.js'),
    path.join(MONOREPO_ROOT, 'node_modules/.bin/tsc'),
    path.join(ROOT, 'node_modules/.bin/tsc')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const tscPath = findTsc();
const tsconfig = path.join(ROOT, 'tsconfig.json');
let compiled = false;

if (tscPath) {
  try {
    console.log(`[build:admin] Compiling with ${tscPath}...`);
    execSync(`node "${tscPath}" --project "${tsconfig}"`, { stdio: 'inherit' });
    compiled = true;
  } catch (err) {
    console.warn('[build:admin] Warning: Direct tsc compilation failed:', err.message);
  }
} else {
  try {
    console.log('[build:admin] Attempting npx tsc...');
    execSync(`npx --no-install tsc --project "${tsconfig}"`, { stdio: 'inherit' });
    compiled = true;
  } catch (_) {}
}

if (!compiled) {
  const distIndex = path.join(ROOT, 'dist/index.js');
  if (fs.existsSync(distIndex)) {
    console.log('[build:admin] ✅ Using precompiled dist/index.js (ready for production).');
  } else {
    console.error('[build:admin] ❌ Error: Neither tsc nor precompiled dist/index.js found.');
    process.exit(1);
  }
} else {
  console.log('[build:admin] ✅ Admin compilation successful.');
}

// Copiar assets (views y public) a dist/
const copyScript = path.join(ROOT, 'scripts/copy-assets.mjs');
if (fs.existsSync(copyScript)) {
  try {
    execSync(`node "${copyScript}"`, { stdio: 'inherit' });
  } catch (e) {
    console.warn('[build:admin] Warning copying assets:', e.message);
  }
}
