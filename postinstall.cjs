// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge
// Se ejecuta automáticamente después de "npm install".
//
// En Hostinger (sin campo de build command), este script es el único punto
// donde podemos ejecutar builds. Realiza en orden:
//   1. prisma generate
//   2. build backend  → backend/dist/
//   3. build admin    → admin/dist/
//   4. build frontend → frontend/out/  (usa NEXT_PUBLIC_API_URL del entorno)
//   5. deploy        → copia frontend/out/ a public_html/ + crea proxies PHP
//
// NOTA: Los builds de producción requieren las variables de entorno definidas
// en el panel de Hostinger (Environment variables). En particular:
//   - DATABASE_URL     para prisma generate
//   - NEXT_PUBLIC_API_URL para el bundle del frontend
// ==============================================================================

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const isHostinger = process.platform === 'linux';

console.log('\n[postinstall] ==========================================');
console.log('[postinstall] Bearded Mountaineer Lodge — Build & Deploy');
console.log('[postinstall] CWD:', ROOT);
console.log('[postinstall] NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('[postinstall] Platform:', process.platform);
console.log('[postinstall] ==========================================\n');

// ── Cargar .env.production primero, luego .env ───────────────────────────────
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const l of lines) {
      const t = l.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.substring(0, eq).trim();
      let v = t.substring(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.substring(1, v.length - 1);
      }
      // Las variables del panel de Hostinger ya están en process.env — no sobreescribir
      if (!process.env[k]) process.env[k] = v;
    }
    console.log('[postinstall] Loaded env from:', path.basename(file));
  } catch (_) {}
}

loadEnv(path.join(ROOT, '.env.production'));
loadEnv(path.join(ROOT, '.env'));

// Prisma necesita una DATABASE_URL válida para generar el cliente
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://dummy:dummy@localhost:3306/dummy';
}

// ── Entorno de ejecución con PATH enriquecido ────────────────────────────────
const binPaths = [
  path.join(ROOT, 'node_modules/.bin'),
  path.join(ROOT, 'backend/node_modules/.bin'),
  path.join(ROOT, 'admin/node_modules/.bin'),
  path.join(ROOT, 'frontend/node_modules/.bin')
].filter(fs.existsSync);

const customEnv = {
  ...process.env,
  NODE_ENV: 'production',
  PATH: binPaths.length > 0
    ? binPaths.join(path.delimiter) + path.delimiter + (process.env.PATH || '')
    : (process.env.PATH || '')
};

// ── Helper: ejecutar comando con logs y PATH enriquecido ───────────────────────
function run(cmd, cwd) {
  const dir = cwd ? path.join(ROOT, cwd) : ROOT;
  if (!fs.existsSync(dir)) {
    console.log(`[postinstall] ⚠️  Skipping (dir not found): ${cwd}`);
    return false;
  }
  console.log(`[postinstall] → ${cmd}  (in: ${cwd || '.'})`);
  try {
    execSync(cmd, { cwd: dir, stdio: 'inherit', env: customEnv });
    return true;
  } catch (e) {
    console.error(`[postinstall] ❌ Failed: ${cmd}\n   ${e.message}`);
    return false;
  }
}

// ── Helper: Resolver compilador TypeScript (tsc) directo ──────────────────────
function getTscInvocation(projectDir) {
  const tsconfigPath = path.join(ROOT, projectDir, 'tsconfig.json');
  const tscJsCandidates = [
    path.join(ROOT, 'node_modules/typescript/bin/tsc'),
    path.join(ROOT, 'node_modules/typescript/lib/tsc.js'),
    path.join(ROOT, projectDir, 'node_modules/typescript/bin/tsc'),
    path.join(ROOT, projectDir, 'node_modules/typescript/lib/tsc.js')
  ];

  for (const cand of tscJsCandidates) {
    if (fs.existsSync(cand)) {
      return `node "${cand}" --project "${tsconfigPath}"`;
    }
  }

  const binTsc = path.join(ROOT, 'node_modules/.bin/tsc');
  if (fs.existsSync(binTsc)) {
    return `"${binTsc}" --project "${tsconfigPath}"`;
  }

  return `npx tsc --project "${tsconfigPath}"`;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    try {
      entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
    } catch (_) {}
  }
}

// ── 1. PRISMA GENERATE ────────────────────────────────────────────────────────
console.log('\n[postinstall] === [1/5] Prisma Generate ===');

// Permisos en Linux (Hostinger)
if (isHostinger) {
  try {
    execSync(`find "${path.join(ROOT, 'node_modules')}" -name "schema-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`find "${path.join(ROOT, 'node_modules')}" -name "query-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`chmod -R +x "${path.join(ROOT, 'node_modules/.bin')}" 2>/dev/null || true`, { stdio: 'ignore' });
  } catch (_) {}
}

const schemaFile = path.join(ROOT, 'backend/prisma/schema.prisma');
const localPrisma = path.join(ROOT, 'node_modules/prisma/build/index.js');
const binPrisma   = path.join(ROOT, 'node_modules/.bin/prisma');

const prismaCommands = [
  fs.existsSync(localPrisma) ? `node "${localPrisma}" generate --schema="${schemaFile}"` : null,
  fs.existsSync(binPrisma)   ? `"${binPrisma}" generate --schema="${schemaFile}"` : null,
  `npx prisma generate --schema="${schemaFile}"`
].filter(Boolean);

let prismaOk = false;
for (const cmd of prismaCommands) {
  try {
    execSync(cmd, { stdio: 'pipe', env: customEnv });
    console.log('[postinstall] ✅ Prisma Client generado.');
    prismaOk = true;
    break;
  } catch (_) {}
}
if (!prismaOk) console.warn('[postinstall] ⚠️  Prisma generate falló. Continúa de todas formas.');

// Propagar .prisma a los workspaces
try {
  const rootPrisma = path.join(ROOT, 'node_modules/.prisma');
  if (fs.existsSync(rootPrisma)) {
    copyDir(rootPrisma, path.join(ROOT, 'admin/node_modules/.prisma'));
    copyDir(rootPrisma, path.join(ROOT, 'backend/node_modules/.prisma'));
  }
} catch (_) {}

// ── 2. BUILD BACKEND ─────────────────────────────────────────────────────────
console.log('\n[postinstall] === [2/5] Build Backend ===');
const backendCmd = getTscInvocation('backend');
console.log('[postinstall] → Compilando backend con:', backendCmd);
let backendOk = false;
try {
  execSync(backendCmd, { cwd: ROOT, stdio: 'inherit', env: customEnv });
  backendOk = true;
  console.log('[postinstall] ✅ Backend compilado correctamente.');
} catch (e) {
  console.warn('[postinstall] ⚠️  Compilación directa de backend falló, intentando npm run build...');
  backendOk = run('npm run build', 'backend');
}

// ── 3. BUILD ADMIN ───────────────────────────────────────────────────────────
console.log('\n[postinstall] === [3/5] Build Admin ===');
const adminCmd = getTscInvocation('admin');
console.log('[postinstall] → Compilando admin con:', adminCmd);
let adminOk = false;
try {
  execSync(adminCmd, { cwd: ROOT, stdio: 'inherit', env: customEnv });
  const copyAssets = path.join(ROOT, 'admin/scripts/copy-assets.mjs');
  if (fs.existsSync(copyAssets)) {
    execSync(`node "${copyAssets}"`, { cwd: path.join(ROOT, 'admin'), stdio: 'inherit', env: customEnv });
  }
  adminOk = true;
  console.log('[postinstall] ✅ Admin compilado y assets copiados.');
} catch (e) {
  console.warn('[postinstall] ⚠️  Compilación directa de admin falló, intentando npm run build...');
  adminOk = run('npm run build', 'admin');
}

// ── 4. BUILD FRONTEND ────────────────────────────────────────────────────────
console.log('\n[postinstall] === [4/5] Build Frontend ===');

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  console.warn('[postinstall] ⚠️  NEXT_PUBLIC_API_URL no está definida en el entorno.');
  console.warn('   Se usará fallback relativo "/api".');
  process.env.NEXT_PUBLIC_API_URL = '/api';
} else {
  console.log('[postinstall] ✅ NEXT_PUBLIC_API_URL =', apiUrl);
}

const frontendBuildScript = path.join(ROOT, 'frontend/scripts/build.cjs');
let frontendOk = false;

if (fs.existsSync(frontendBuildScript)) {
  console.log('[postinstall] → Compilando frontend con script autónomo:', frontendBuildScript);
  try {
    execSync(`node "${frontendBuildScript}"`, { cwd: path.join(ROOT, 'frontend'), stdio: 'inherit', env: customEnv });
    frontendOk = true;
    console.log('[postinstall] ✅ Frontend exportado exitosamente con build.cjs.');
  } catch (err) {
    console.warn('[postinstall] ⚠️  Falló compilación directa con build.cjs:', err.message);
  }
}

if (!frontendOk) {
  console.log('[postinstall] → Intentando npm run build en frontend...');
  frontendOk = run('npm run build', 'frontend');
}

// ── 5. DEPLOY A PUBLIC_HTML ───────────────────────────────────────────────────
console.log('\n[postinstall] === [5/6] Deploy a public_html ===');

const frontendOut   = path.join(ROOT, 'frontend/out');
const proxyApiSrc   = path.join(ROOT, 'deployment/proxy-api.php');
const proxyAdminSrc = path.join(ROOT, 'deployment/proxy-admin.php');
const nodePort      = String(process.env.GATEWAY_PORT || process.env.PORT || '4000');

// Si frontend/out/index.html no existe, intentar build de emergencia directo
if (!fs.existsSync(path.join(frontendOut, 'index.html')) && fs.existsSync(frontendBuildScript)) {
  console.warn('[postinstall] ⚠️  frontend/out/index.html aún no existe. Ejecutando build de emergencia...');
  try {
    execSync(`node "${frontendBuildScript}"`, { cwd: path.join(ROOT, 'frontend'), stdio: 'inherit', env: customEnv });
  } catch (e) {
    console.error('[postinstall] ❌ Build de emergencia de frontend falló:', e.message);
  }
}

// Resolver TODOS los destinos válidos de public_html
function resolveTargetDirs() {
  const candidates = [];

  // 1. Destino canónico oficial en Hostinger para Bearded Mountaineer Lodge (solo en Linux / producción)
  if (isHostinger) {
    candidates.push('/home/u251936581/domains/beardedmountaineerlodge.com/public_html');
  }

  // 2. Si ROOT mismo es public_html
  if (path.basename(ROOT) === 'public_html') {
    candidates.push(ROOT);
  } else {
    // 3. Subcarpeta public_html dentro de ROOT
    candidates.push(path.join(ROOT, 'public_html'));

    // 4. Solo si ROOT es un subdirectorio como nodejs/ o app/ dentro del dominio
    const parentName = path.basename(path.dirname(ROOT));
    const baseName = path.basename(ROOT);
    if ((baseName === 'nodejs' || baseName === 'app') && parentName === 'beardedmountaineerlodge.com') {
      candidates.push(path.resolve(ROOT, '../public_html'));
    }
  }

  // 5. Variable opcional de entorno
  if (process.env.PUBLIC_HTML_PATH) {
    candidates.push(path.resolve(process.env.PUBLIC_HTML_PATH));
  }

  const seen = new Set();
  const valid = [];

  for (const raw of candidates) {
    const norm = isHostinger ? path.posix.normalize(raw) : path.resolve(raw);
    if (seen.has(norm)) continue;
    seen.add(norm);

    // SANDBOX GUARD: Jamás tocar mycoandes ni raíces de usuario no autorizadas
    if (norm.includes('mycoandes')) {
      console.error(`[postinstall] 🛑 BLOQUEO DE SEGURIDAD: Destino rechazado: "${norm}"`);
      continue;
    }
    if (norm === '/home/u251936581' || norm === '/home/u251936581/public_html' || norm === '/home/u251936581/domains') {
      console.error(`[postinstall] 🛑 BLOQUEO DE SEGURIDAD: Raíz no permitida: "${norm}"`);
      continue;
    }

    valid.push(norm);
  }

  return valid;
}

const targetDirs = resolveTargetDirs();
console.log('[postinstall] Destinos detectados para despliegue:', targetDirs);

// .htaccess para subcarpetas /api y /admin (relativo a su directorio)
const subHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . index.php [L]
</IfModule>
`;

// .htaccess raíz optimizado para carga estática instantánea y redirección a proxies
const rootHtaccess = `DirectoryIndex index.html index.php
Options -Indexes +FollowSymLinks

<IfModule mod_headers.c>
  <FilesMatch "\\.(js|mjs|css|woff2|woff|ttf|svg|webp|png|jpg|jpeg|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Rutas de API (/api o subdominio api.)
  RewriteCond %{HTTP_HOST} ^api\\. [NC,OR]
  RewriteRule ^api(/.*)?$ api/index.php [L,QSA]

  # 2. Rutas de Admin (/admin o subdominio admin.)
  RewriteCond %{HTTP_HOST} ^admin\\. [NC,OR]
  RewriteRule ^admin(/.*)?$ admin/index.php [L,QSA]

  # 3. Servir archivos físicos existentes directamente (máxima velocidad, sin Node ni PHP)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Fallback SPA para Next.js (sirve index.html)
  RewriteRule ^ /index.html [L]
</IfModule>
`;

const hasFrontendOut = fs.existsSync(frontendOut) && fs.existsSync(path.join(frontendOut, 'index.html'));
if (!hasFrontendOut) {
  console.warn('[postinstall] ⚠️  frontend/out/index.html no está presente.');
}

fs.mkdirSync(path.join(ROOT, 'admin/uploads'), { recursive: true });
let deployedCount = 0;

for (const pubDir of targetDirs) {
  console.log(`\n[postinstall] → Desplegando en destino: ${pubDir}`);

  try {
    // 1. Crear carpetas principales
    fs.mkdirSync(pubDir, { recursive: true });
    const apiDir = path.join(pubDir, 'api');
    const adminDir = path.join(pubDir, 'admin');
    const adminStaticDir = path.join(adminDir, 'static');
    const uploadsDir = path.join(pubDir, 'uploads');
    const adminUploadsDir = path.join(adminDir, 'uploads');

    fs.mkdirSync(apiDir, { recursive: true });
    fs.mkdirSync(adminDir, { recursive: true });
    fs.mkdirSync(adminStaticDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(adminUploadsDir, { recursive: true });

    // 2. Copiar frontend estático si existe
    if (hasFrontendOut) {
      const nextDir = path.join(pubDir, '_next');
      if (fs.existsSync(nextDir)) fs.rmSync(nextDir, { recursive: true, force: true });
      fs.cpSync(frontendOut, pubDir, { recursive: true });
      console.log(`[postinstall]   ✅ Archivos de frontend/out copiados a: ${pubDir}`);
    } else {
      const fallbackHtml = path.join(pubDir, 'index.html');
      if (!fs.existsSync(fallbackHtml)) {
        fs.writeFileSync(fallbackHtml, '<!DOCTYPE html><html><head><title>Bearded Mountaineer Lodge</title></head><body><h1>Bearded Mountaineer Lodge</h1></body></html>');
      }
    }

    // 3. Copiar assets de frontend/public/ a pubDir
    const frontendPublic = path.join(ROOT, 'frontend/public');
    if (fs.existsSync(frontendPublic)) {
      copyDir(frontendPublic, pubDir);
      console.log(`[postinstall]   ✅ Assets de frontend/public copiados a: ${pubDir}`);
    }

    // 4. Limpiar archivos .txt residuales de Next.js
    for (const f of fs.readdirSync(pubDir)) {
      if (f.startsWith('__next.') || (f.endsWith('.txt') && f !== 'robots.txt')) {
        try { fs.unlinkSync(path.join(pubDir, f)); } catch (_) {}
      }
    }

    // 5. Eliminar default.php de Hostinger si existe
    const defaultPhp = path.join(pubDir, 'default.php');
    if (fs.existsSync(defaultPhp)) {
      try { fs.unlinkSync(defaultPhp); } catch (_) {}
    }

    // 6. Escribir .htaccess y .node_port raíz
    fs.writeFileSync(path.join(pubDir, '.htaccess'), rootHtaccess.trim());
    fs.writeFileSync(path.join(pubDir, '.node_port'), nodePort);
    console.log(`[postinstall]   ✅ Frontend raíz configurado en: ${pubDir}`);

    // 7. Configurar subcarpeta /api
    if (fs.existsSync(proxyApiSrc)) {
      fs.copyFileSync(proxyApiSrc, path.join(apiDir, 'index.php'));
    }
    fs.writeFileSync(path.join(apiDir, '.htaccess'), subHtaccess.trim());
    fs.writeFileSync(path.join(apiDir, '.node_port'), nodePort);
    console.log(`[postinstall]   ✅ API proxy configurado en: ${apiDir}`);

    // 8. Configurar subcarpeta /admin
    if (fs.existsSync(proxyAdminSrc)) {
      fs.copyFileSync(proxyAdminSrc, path.join(adminDir, 'index.php'));
    } else if (fs.existsSync(proxyApiSrc)) {
      fs.copyFileSync(proxyApiSrc, path.join(adminDir, 'index.php'));
    }
    fs.writeFileSync(path.join(adminDir, '.htaccess'), subHtaccess.trim());
    fs.writeFileSync(path.join(adminDir, '.node_port'), nodePort);

    // 9. Copiar assets de admin a adminDir y adminDir/static
    const adminPublic = path.join(ROOT, 'admin/public');
    if (fs.existsSync(adminPublic)) {
      copyDir(adminPublic, adminDir);
      copyDir(adminPublic, adminStaticDir);
    }
    const adminDistPublic = path.join(ROOT, 'admin/dist/public');
    if (fs.existsSync(adminDistPublic)) {
      copyDir(adminDistPublic, adminDir);
      copyDir(adminDistPublic, adminStaticDir);
    }
    console.log(`[postinstall]   ✅ Admin proxy y assets configurados en: ${adminDir}`);

    deployedCount++;
  } catch (err) {
    console.error(`[postinstall] ❌ Error desplegando en ${pubDir}:`, err.message);
  }
}

console.log(`[postinstall] Despliegues completados: ${deployedCount}`);

// restart.txt para Passenger/LiteSpeed
try {
  fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'tmp/restart.txt'), String(Date.now()));
} catch (_) {}

// ── 6. LIMPIEZA DE CACHÉ EN HOSTINGER ─────────────────────────────────────────
console.log('\n[postinstall] === [6/6] Limpieza de caché temporal ===');
if (isHostinger) {
  try {
    // 1. Limpiar caché global de npm
    execSync('npm cache clean --force 2>/dev/null || true', { stdio: 'ignore' });
    console.log('[postinstall] ✅ npm cache clean ejecutado.');

    // 2. Limpiar cachés pesadas acumuladas en ~/.cache/
    const userHome = process.env.HOME || '/home/u251936581';
    const cacheDir = path.join(userHome, '.cache');
    if (fs.existsSync(cacheDir)) {
      const heavyDirs = ['next', 'turbo', 'prisma', 'yarn', 'pip'];
      for (const d of heavyDirs) {
        const p = path.join(cacheDir, d);
        if (fs.existsSync(p)) {
          fs.rmSync(p, { recursive: true, force: true });
        }
      }
      console.log('[postinstall] ✅ Subdirectorios pesados de ~/.cache limpiados.');
    }
  } catch (err) {
    console.warn('[postinstall] ⚠️  Aviso en limpieza de caché:', err.message);
  }
}

console.log('\n[postinstall] ✅ Build & Deploy completado.\n');
process.exit(0);
