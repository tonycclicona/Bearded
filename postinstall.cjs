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

// ── Helper: ejecutar comando con logs ────────────────────────────────────────
function run(cmd, cwd) {
  const dir = cwd ? path.join(ROOT, cwd) : ROOT;
  if (!fs.existsSync(dir)) {
    console.log(`[postinstall] ⚠️  Skipping (dir not found): ${cwd}`);
    return false;
  }
  console.log(`[postinstall] → ${cmd}  (in: ${cwd || '.'})`);
  try {
    execSync(cmd, { cwd: dir, stdio: 'inherit', env: process.env });
    return true;
  } catch (e) {
    console.error(`[postinstall] ❌ Failed: ${cmd}\n   ${e.message}`);
    return false;
  }
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
    execSync(cmd, { stdio: 'pipe', env: process.env });
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
run('npm run build', 'backend');

// ── 3. BUILD ADMIN ───────────────────────────────────────────────────────────
console.log('\n[postinstall] === [3/5] Build Admin ===');
run('npm run build', 'admin');

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

// ── 5. DEPLOY a public_html ───────────────────────────────────────────────────
console.log('\n[postinstall] === [5/5] Deploy a public_html ===');

const frontendOut = path.join(ROOT, 'frontend/out');
const publicHtml  = process.env.PUBLIC_HTML_PATH || path.join(ROOT, 'public_html');
const proxySrc    = path.join(ROOT, 'deployment/proxy-api.php');
const nodePort    = process.env.GATEWAY_PORT || '4000';

// ── SAFETY SANDBOX GUARD ──────────────────────────────────────────────────────
// Proteger estrictamente contra contaminación de otros dominios (ej. mycoandes)
// o sobreescritura de la raíz compartida de la cuenta de hosting.
const forbiddenPaths = [
  '/home/u251936581',
  '/home/u251936581/public_html',
  'mycoandes'
];

const normalizedTarget = path.normalize(publicHtml).toLowerCase();
for (const forbidden of forbiddenPaths) {
  if (normalizedTarget === path.normalize(forbidden).toLowerCase() || (forbidden === 'mycoandes' && normalizedTarget.includes('mycoandes'))) {
    console.error(`\n[postinstall] 🛑 BLOQUEO DE SEGURIDAD: Intento de escribir en ruta protegida o ajena: "${publicHtml}"`);
    console.error('[postinstall] El despliegue de Bearded debe permanecer 100% aislado dentro de su propio dominio.\n');
    process.exit(1);
  }
}

if (!fs.existsSync(frontendOut)) {
  console.warn('[postinstall] ⚠️  frontend/out/ no existe, omitiendo deploy a public_html.');
} else {
  // Crear estructura
  fs.mkdirSync(publicHtml, { recursive: true });
  fs.mkdirSync(path.join(publicHtml, 'api'), { recursive: true });
  fs.mkdirSync(path.join(publicHtml, 'admin'), { recursive: true });

  // Asegurar que admin/uploads existe y es persistente
  fs.mkdirSync(path.join(ROOT, 'admin/uploads'), { recursive: true });

  // Limpiar _next/ viejo (chunks obsoletos)
  const nextDir = path.join(publicHtml, '_next');
  if (fs.existsSync(nextDir)) fs.rmSync(nextDir, { recursive: true, force: true });

  // Copiar frontend/out/ → public_html/
  try {
    fs.cpSync(frontendOut, publicHtml, { recursive: true });
    console.log('[postinstall] ✅ Frontend copiado a public_html/');
  } catch (e) {
    console.error('[postinstall] ❌ Error copiando frontend:', e.message);
  }

  // Eliminar default.php de Hostinger si existe
  const defaultPhp = path.join(publicHtml, 'default.php');
  if (fs.existsSync(defaultPhp)) fs.unlinkSync(defaultPhp);

  // .htaccess raíz
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

  fs.writeFileSync(path.join(publicHtml, '.htaccess'), htaccessRoot);
  fs.writeFileSync(path.join(publicHtml, '.node_port'), nodePort);
  console.log('[postinstall] ✅ .htaccess generado');

  // Proxy PHP para /api/ y /admin/
  if (fs.existsSync(proxySrc)) {
    const proxyContent = fs.readFileSync(proxySrc, 'utf8');
    const apiHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>`;

    fs.writeFileSync(path.join(publicHtml, 'api/index.php'), proxyContent);
    fs.writeFileSync(path.join(publicHtml, 'api/.htaccess'), apiHtaccess);
    fs.writeFileSync(path.join(publicHtml, 'api/.node_port'), nodePort);

    fs.writeFileSync(path.join(publicHtml, 'admin/index.php'), proxyContent);
    fs.writeFileSync(path.join(publicHtml, 'admin/.htaccess'), apiHtaccess);
    fs.writeFileSync(path.join(publicHtml, 'admin/.node_port'), nodePort);

    console.log('[postinstall] ✅ Proxies PHP creados en api/ y admin/');
  } else {
    console.warn('[postinstall] ⚠️  deployment/proxy-api.php no encontrado, omitiendo proxies.');
  }

  // restart.txt para Passenger/LiteSpeed
  try {
    fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'tmp/restart.txt'), String(Date.now()));
  } catch (_) {}
}

console.log('\n[postinstall] ✅ Build & Deploy completado.\n');
process.exit(0);
