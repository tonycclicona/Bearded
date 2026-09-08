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
  console.warn('[postinstall] ⚠️  NEXT_PUBLIC_API_URL no está definida.');
  console.warn('   Define esta variable en el panel de Hostinger → Environment variables.');
  console.warn('   El frontend compilará sin URL de API y fallará en producción.');
} else {
  console.log('[postinstall] ✅ NEXT_PUBLIC_API_URL =', apiUrl);
}

run('npm run build', 'frontend');

// ── 5. DEPLOY A PUBLIC_HTML ───────────────────────────────────────────────────
console.log('\n[postinstall] === [5/5] Deploy a public_html ===');

const frontendOut = path.join(ROOT, 'frontend/out');
const proxySrc    = fs.existsSync(path.join(ROOT, 'deployment/proxy-api.php'))
  ? path.join(ROOT, 'deployment/proxy-api.php')
  : path.join(ROOT, 'proxy-api.php');
const nodePort    = String(process.env.GATEWAY_PORT || process.env.PORT || '4000');

// ── DIRECCIONES OFICIALES DE HOSTINGER ────────────────────────────────────────
// 1. Dominio principal: /home/u251936581/domains/beardedmountaineerlodge.com/public_html
// 2. Admin subcarpeta: /home/u251936581/domains/beardedmountaineerlodge.com/public_html/admin
// 3. API subcarpeta:   /home/u251936581/domains/beardedmountaineerlodge.com/public_html/api
const HOSTINGER_OFFICIAL_PUBLIC_HTML = '/home/u251936581/domains/beardedmountaineerlodge.com/public_html';

const targetCandidates = [
  path.join(ROOT, 'public_html'),
  HOSTINGER_OFFICIAL_PUBLIC_HTML,
  process.env.PUBLIC_HTML_PATH
].filter(Boolean);

// Filtrar targets únicos normalizados
const targetDirs = [];
const seenTargets = new Set();
for (const cand of targetCandidates) {
  const norm = path.normalize(cand);
  if (!seenTargets.has(norm.toLowerCase())) {
    seenTargets.add(norm.toLowerCase());
    targetDirs.push(norm);
  }
}

// ── SAFETY SANDBOX GUARD ──────────────────────────────────────────────────────
function isAllowedSandboxPath(targetPath) {
  const lower = path.normalize(targetPath).toLowerCase();
  // 1. Prohibir estrictamente cualquier referencia a mycoandes
  if (lower.includes('mycoandes')) return false;
  // 2. Prohibir la raíz genérica de la cuenta de hosting
  if (lower === '/home/u251936581' || lower === '/home/u251936581/public_html' || lower === 'c:\\home\\u251936581') return false;
  // 3. Si es una ruta bajo /home/u251936581, DEBE pertenecer a beardedmountaineerlodge.com
  if (lower.startsWith('/home/u251936581') && !lower.includes('beardedmountaineerlodge.com')) return false;
  return true;
}

if (!fs.existsSync(frontendOut)) {
  console.warn('[postinstall] ⚠️  frontend/out/ no existe, omitiendo deploy a public_html.');
} else {
  // Asegurar persistencia del directorio de uploads del admin
  fs.mkdirSync(path.join(ROOT, 'admin/uploads'), { recursive: true });

  const htaccessRoot = `DirectoryIndex index.html index.php
Options -Indexes +FollowSymLinks

<IfModule mod_mime.c>
  AddType application/javascript .js .mjs
  AddType text/css .css
  AddType image/svg+xml .svg
  AddType font/woff2 .woff2
  AddType font/woff .woff
  AddType image/webp .webp
</IfModule>

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

  RewriteCond %{HTTP:X-Bypass-Proxy} 1
  RewriteRule ^ - [L]

  RewriteCond %{HTTP_HOST} ^api\\. [NC]
  RewriteRule ^(.*)$ api/index.php [L,QSA]

  RewriteCond %{HTTP_HOST} ^admin\\. [NC]
  RewriteCond %{REQUEST_URI} !^/static/ [NC]
  RewriteCond %{REQUEST_URI} !^/uploads/ [NC]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^(.*)$ admin/index.php [L,QSA]

  RewriteRule ^api(/.*)?$ api/index.php [L,QSA]

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^admin(/.*)?$ admin/index.php [L,QSA]

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>`;

  const subHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>`;

  let deployedCount = 0;

  for (const pubDir of targetDirs) {
    if (!isAllowedSandboxPath(pubDir)) {
      console.error(`[postinstall] 🛑 BLOQUEO DE SEGURIDAD: Destino rechazado: "${pubDir}"`);
      continue;
    }

    // Si es una ruta absoluta en Hostinger, verificar que el padre exista antes de escribir
    const parentDir = path.dirname(pubDir);
    const isLocalDir = pubDir.startsWith(ROOT);
    if (!isLocalDir && !fs.existsSync(parentDir)) {
      console.log(`[postinstall] ℹ️  Omitiendo ruta de producción (${parentDir} no existe en este entorno).`);
      continue;
    }

    console.log(`[postinstall] → Desplegando en destino: ${pubDir}`);

    try {
      // 1. Crear directorios principales y subdominios correspondientes
      fs.mkdirSync(pubDir, { recursive: true });
      fs.mkdirSync(path.join(pubDir, 'api'), { recursive: true });
      fs.mkdirSync(path.join(pubDir, 'admin'), { recursive: true });

      // 2. Limpiar _next viejo
      const nextDir = path.join(pubDir, '_next');
      if (fs.existsSync(nextDir)) fs.rmSync(nextDir, { recursive: true, force: true });

      // 3. Copiar frontend estático
      fs.cpSync(frontendOut, pubDir, { recursive: true });
      console.log(`[postinstall]   ✅ Frontend copiado en: ${pubDir}`);

      // 4. Eliminar default.php de Hostinger si existe
      const defaultPhp = path.join(pubDir, 'default.php');
      if (fs.existsSync(defaultPhp)) {
        try { fs.unlinkSync(defaultPhp); } catch (_) {}
      }

      // 5. Configurar .htaccess y .node_port raíz
      fs.writeFileSync(path.join(pubDir, '.htaccess'), htaccessRoot);
      fs.writeFileSync(path.join(pubDir, '.node_port'), nodePort);

      // 6. Configurar proxies PHP en /api/ y /admin/
      if (fs.existsSync(proxySrc)) {
        const proxyContent = fs.readFileSync(proxySrc, 'utf8');

        // /api
        const apiDir = path.join(pubDir, 'api');
        fs.writeFileSync(path.join(apiDir, 'index.php'), proxyContent);
        fs.writeFileSync(path.join(apiDir, '.htaccess'), subHtaccess);
        fs.writeFileSync(path.join(apiDir, '.node_port'), nodePort);

        // /admin
        const adminDir = path.join(pubDir, 'admin');
        fs.writeFileSync(path.join(adminDir, 'index.php'), proxyContent);
        fs.writeFileSync(path.join(adminDir, '.htaccess'), subHtaccess);
        fs.writeFileSync(path.join(adminDir, '.node_port'), nodePort);

        console.log(`[postinstall]   ✅ Proxies PHP configurados en: ${pubDir}/api y ${pubDir}/admin`);
      }

      deployedCount++;
    } catch (err) {
      console.error(`[postinstall] ❌ Error desplegando en ${pubDir}:`, err.message);
    }
  }

  console.log(`[postinstall] Despliegues a public_html completados: ${deployedCount}`);

  // restart.txt para Passenger/LiteSpeed
  try {
    fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'tmp/restart.txt'), String(Date.now()));
  } catch (_) {}
}

console.log('\n[postinstall] ✅ Build & Deploy completado.\n');
process.exit(0);
