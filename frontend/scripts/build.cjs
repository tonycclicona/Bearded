'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(ROOT, '..');

console.log('[build:frontend] Iniciando build de Next.js...');

function findNextBin() {
  const candidates = [
    path.join(MONOREPO_ROOT, 'node_modules/next/dist/bin/next'),
    path.join(ROOT, 'node_modules/next/dist/bin/next'),
    path.join(MONOREPO_ROOT, 'node_modules/.bin/next'),
    path.join(ROOT, 'node_modules/.bin/next')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const nextBin = findNextBin();
let buildOk = false;

const env = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_TELEMETRY_DISABLED: '1'
};
if (!env.NEXT_PUBLIC_API_URL) {
  env.NEXT_PUBLIC_API_URL = '/api';
}

if (nextBin) {
  try {
    console.log(`[build:frontend] Ejecutando: node "${nextBin}" build...`);
    execSync(`node "${nextBin}" build`, { cwd: ROOT, stdio: 'inherit', env });
    buildOk = true;
  } catch (err) {
    console.warn('[build:frontend] Advertencia: fallo con binario directo de next:', err.message);
  }
}

if (!buildOk) {
  try {
    console.log('[build:frontend] Intentando: npx next build...');
    execSync('npx next build', { cwd: ROOT, stdio: 'inherit', env });
    buildOk = true;
  } catch (e) {
    console.warn('[build:frontend] Advertencia: fallo npx next build:', e.message);
  }
}

const outIndex = path.join(ROOT, 'out/index.html');
if (fs.existsSync(outIndex)) {
  console.log('[build:frontend] ✅ Exportación estática generada exitosamente en frontend/out/');
} else {
  console.error('[build:frontend] ❌ Error: frontend/out/index.html no fue generado.');
  process.exit(1);
}
