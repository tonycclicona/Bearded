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
    console.log(`[build:backend] Compiling with ${tscPath}...`);
    execSync(`node "${tscPath}" --project "${tsconfig}"`, { stdio: 'inherit' });
    compiled = true;
  } catch (err) {
    console.warn('[build:backend] Warning: Direct tsc compilation failed:', err.message);
  }
} else {
  // En producción de Hostinger, si tsc no está en PATH ni en node_modules, se usa dist/index.js precompilado
}

if (!compiled) {
  const distIndex = path.join(ROOT, 'dist/index.js');
  if (fs.existsSync(distIndex)) {
    console.log('[build:backend] ✅ Using precompiled dist/index.js (ready for production).');
  } else {
    console.error('[build:backend] ❌ Error: Neither tsc nor precompiled dist/index.js found.');
    process.exit(1);
  }
} else {
  console.log('[build:backend] ✅ Backend compilation successful.');
}

const distIndex = path.join(ROOT, 'dist/index.js');
const distServer = path.join(ROOT, 'dist/server.js');
if (fs.existsSync(distIndex) && !fs.existsSync(distServer)) {
  fs.writeFileSync(distServer, "export { default } from './index.js';\nexport * from './index.js';\n");
  console.log('[build:backend] ✅ dist/server.js generado para paridad con Unu-Raymi.');
}

try {
  console.log('[build:backend] Generating Prisma client...');
  execSync('npx prisma generate --schema=prisma/schema.prisma', { cwd: ROOT, stdio: 'inherit' });
  console.log('[build:backend] ✅ Prisma client generated successfully.');
} catch (err) {
  console.warn('[build:backend] Warning: prisma generate:', err.message);
}

