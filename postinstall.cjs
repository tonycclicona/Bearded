// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge Backend Build Engine
// Dedicated Node.js App for api.beardedmountaineerlodge.com
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();

console.log('\n[postinstall] ==========================================');
console.log('[postinstall] Starting Bearded API Backend Build');
console.log('[postinstall] CWD:', ROOT);
console.log('[postinstall] ==========================================\n');

function run(cmd, subdir) {
  const cwd = subdir ? path.join(ROOT, subdir) : ROOT;
  if (!fs.existsSync(cwd)) {
    console.log(`[postinstall] Skipping ${subdir} (directory does not exist)`);
    return;
  }
  console.log(`[postinstall] Running: "${cmd}" in: ${cwd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
    console.log(`[postinstall] ✅ Finished: "${cmd}" in: ${subdir}`);
  } catch (err) {
    console.error(`[postinstall] ❌ ERROR running "${cmd}" in ${subdir}:`, err.message);
  }
}

// ── 0. SALVAGUARDA INMUTABLE DE BASE DE DATOS Y CARPETAS DE SUBIDA ────────────
console.log('[postinstall] === 0/2 PRESERVING DATABASE & USER UPLOADS ===');
try {
  const backendDataDir = path.join(ROOT, 'backend/data');
  const dbJsonPath = path.join(backendDataDir, 'db.json');
  if (fs.existsSync(dbJsonPath)) {
    const backupName = `db.backup.${Date.now()}.json`;
    const backupPath = path.join(backendDataDir, backupName);
    fs.copyFileSync(dbJsonPath, backupPath);
    console.log(`[postinstall] 🛡️ Base de datos existente preservada. Backup creado: ${backupName}`);
  } else {
    console.log('[postinstall] ℹ️ Base de datos db.json no detectada; el backend inicializará una plantilla segura si es primera instalación.');
  }

  // Asegurar persistencia de directorio canónico de uploads
  const targetUploads = process.env.UPLOADS_DIR 
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(ROOT, 'uploads');
  if (!fs.existsSync(targetUploads)) {
    fs.mkdirSync(targetUploads, { recursive: true });
  }

  // Mantener compatibilidad con uploads previo si existe
  const legacyUploads = path.join(ROOT, 'admin/uploads');
  if (!fs.existsSync(legacyUploads)) {
    fs.mkdirSync(legacyUploads, { recursive: true });
  }
  console.log(`[postinstall] 🛡️ Carpeta de uploads verificada: ${targetUploads}`);
} catch (backupErr) {
  console.warn('[postinstall] Warning en salvaguarda de base de datos:', backupErr.message);
}

// ── 1. COMPILAR BACKEND ─────────────────────────────────────────────────────────
console.log('[postinstall] === 1/2 BACKEND setup ===');
try {
  const nodeModulesPath = path.join(ROOT, 'node_modules');
  if (process.platform === 'linux' && fs.existsSync(nodeModulesPath)) {
    execSync(`find "${nodeModulesPath}" -name "schema-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`find "${nodeModulesPath}" -name "query-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
  }
} catch (_) {}

run('node scripts/build.cjs', 'backend');

// ── 2. TRIGGER DE REINICIO LITESPEED / CLOUDLINUX NODE.JS RUNNER ──────────────
console.log('[postinstall] === 2/2 LITESPEED RESTART TRIGGER ===');
try {
  const tmpDir = path.join(ROOT, 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()));
  console.log('[postinstall] ✅ Trigger de reinicio creado en tmp/restart.txt');
} catch (tmpErr) {
  console.warn('[postinstall] Warning al crear tmp/restart.txt:', tmpErr.message);
}

console.log('\n[postinstall] ✅ Compilación y preparación del Backend completadas con éxito.\n');
