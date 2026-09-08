'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(ROOT, '..');

console.log('[build:admin] Iniciando build de Next.js para Admin...');

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
    console.log(`[build:admin] Ejecutando: node "${nextBin}" build...`);
    execSync(`node "${nextBin}" build`, { cwd: ROOT, stdio: 'inherit', env });
    buildOk = true;
  } catch (err) {
    console.warn('[build:admin] Error con node nextBin, intentando npx next build...');
  }
}

if (!buildOk) {
  try {
    execSync('npx next build', { cwd: ROOT, stdio: 'inherit', env });
    buildOk = true;
  } catch (err) {
    console.error('[build:admin] ❌ Error compilando Next.js en admin:', err.message);
    process.exit(1);
  }
}

const outDir = path.join(ROOT, 'out');
if (fs.existsSync(outDir)) {
  console.log('[build:admin] ✅ Exportación estática generada exitosamente en admin/out/');
} else {
  console.error('[build:admin] ❌ No se encontró la carpeta admin/out/ tras el build.');
  process.exit(1);
}
