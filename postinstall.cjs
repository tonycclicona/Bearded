// ==============================================================================
// postinstall.cjs — Monorepo Build & Webroot Setup para Hostinger
// Replicación exacta y enriquecida de la arquitectura probada de Unu-Raymi
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n[postinstall] ==========================================');
console.log('[postinstall] Starting Full Monorepo Build & Setup (Bearded Lodge)');
console.log('[postinstall] CWD:', process.cwd());
console.log('[postinstall] PLATFORM:', process.platform);
console.log('[postinstall] ==========================================\n');

function run(cmd, subdir) {
  const cwd = path.join(process.cwd(), subdir);
  if (!fs.existsSync(cwd)) {
    console.log(`[postinstall] Skipping ${subdir} (directory does not exist)`);
    return;
  }
  console.log(`[postinstall] Running: "${cmd}" in: ${cwd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
    console.log(`[postinstall] ✅ Finished: "${cmd}" in: ${subdir}`);
  } catch (err) {
    console.error(`[postinstall] ⚠️ Error running "${cmd}" in ${subdir}:`, err.message);
  }
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    try {
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (_) {}
  }
}

// ── Búsqueda exhaustiva de carpetas webroot de Hostinger ───────────────────────
function discoverWebroots() {
  const discovered = {
    mainPublicHtml: new Set(),
    adminPublicHtml: new Set(),
    apiPublicHtml: new Set(),
    runtimeDirs: new Set()
  };

  const localPub = path.resolve(process.cwd(), 'public_html');
  discovered.mainPublicHtml.add(localPub);
  discovered.adminPublicHtml.add(path.join(localPub, 'admin'));
  discovered.apiPublicHtml.add(path.join(localPub, 'api'));

  // Si process.cwd() ya es public_html (ej. Hostinger clonó directamente dentro de public_html)
  if (path.basename(process.cwd()).toLowerCase() === 'public_html') {
    discovered.mainPublicHtml.add(process.cwd());
    discovered.adminPublicHtml.add(path.join(process.cwd(), 'admin'));
    discovered.apiPublicHtml.add(path.join(process.cwd(), 'api'));
  }

  // 1. Rutas explícitas de Hostinger (Patrón probado de Unu-Raymi para u251936581 y $HOME)
  const homeCandidates = [
    process.env.HOME,
    process.platform === 'linux' ? '/home/u251936581' : null
  ].filter(Boolean);

  for (const h of homeCandidates) {
    discovered.mainPublicHtml.add(path.join(h, 'domains/beardedmountaineerlodge.com/public_html'));
    discovered.mainPublicHtml.add(path.join(h, 'public_html'));

    discovered.adminPublicHtml.add(path.join(h, 'domains/admin.beardedmountaineerlodge.com/public_html'));
    discovered.adminPublicHtml.add(path.join(h, 'domains/beardedmountaineerlodge.com/public_html/admin'));
    discovered.adminPublicHtml.add(path.join(h, 'public_html/admin'));

    discovered.apiPublicHtml.add(path.join(h, 'domains/api.beardedmountaineerlodge.com/public_html'));
    discovered.apiPublicHtml.add(path.join(h, 'domains/beardedmountaineerlodge.com/public_html/api'));
    discovered.apiPublicHtml.add(path.join(h, 'public_html/api'));

    discovered.runtimeDirs.add(path.join(h, 'domains/beardedmountaineerlodge.com/hbuilds/current/nodejs'));
  }

  // 2. Búsqueda hacia arriba en el árbol de directorios (hasta 8 niveles)
  let current = process.cwd();
  for (let i = 0; i < 8; i++) {
    const pubCandidate = path.join(current, 'public_html');
    if (fs.existsSync(pubCandidate)) {
      discovered.mainPublicHtml.add(pubCandidate);
      discovered.adminPublicHtml.add(path.join(pubCandidate, 'admin'));
      discovered.apiPublicHtml.add(path.join(pubCandidate, 'api'));
    }

    const runCand1 = path.resolve(current, '../current/nodejs');
    const runCand2 = path.resolve(current, '../../current/nodejs');
    if (fs.existsSync(path.dirname(runCand1))) discovered.runtimeDirs.add(runCand1);
    if (fs.existsSync(path.dirname(runCand2))) discovered.runtimeDirs.add(runCand2);

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // 3. Escaneo inteligente de dominios en HOME si existe
  for (const h of homeCandidates) {
    const domainsDir = path.join(h, 'domains');
    if (fs.existsSync(domainsDir)) {
      try {
        const doms = fs.readdirSync(domainsDir);
        for (const d of doms) {
          const dPath = path.join(domainsDir, d);
          const domPub = path.join(dPath, 'public_html');
          discovered.mainPublicHtml.add(domPub);
          discovered.adminPublicHtml.add(path.join(domPub, 'admin'));
          discovered.apiPublicHtml.add(path.join(domPub, 'api'));
          discovered.runtimeDirs.add(path.join(dPath, 'hbuilds/current/nodejs'));

          if (d.startsWith('admin.')) {
            discovered.adminPublicHtml.add(domPub);
          }
          if (d.startsWith('api.')) {
            discovered.apiPublicHtml.add(domPub);
          }
        }
      } catch (_) {}
    }
  }

  return {
    mainPublicHtml: Array.from(discovered.mainPublicHtml),
    adminPublicHtml: Array.from(discovered.adminPublicHtml),
    apiPublicHtml: Array.from(discovered.apiPublicHtml),
    runtimeDirs: Array.from(discovered.runtimeDirs)
  };
}

const webroots = discoverWebroots();

// ── 1. BACKEND & PRISMA SETUP ────────────────────────────────────────────────
console.log('[postinstall] === 1/4 BACKEND & PRISMA setup ===');
try {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (process.platform === 'linux') {
    execSync(`find "${nodeModulesPath}" -name "schema-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`find "${nodeModulesPath}" -name "query-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
  }
} catch (_) {}

try {
  execSync('npx prisma generate --schema=backend/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('✅ [postinstall] Prisma Client generado.');
} catch (e) {
  console.warn('⚠️ [postinstall] Warning prisma generate:', e.message);
}

if (process.env.DATABASE_URL) {
  try {
    console.log('> [postinstall] Sincronizando esquema de base de datos MySQL...');
    execSync('npx prisma db push --schema=backend/prisma/schema.prisma --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ [postinstall] Base de datos sincronizada.');
  } catch (e) {
    console.warn('⚠️ [postinstall] Warning prisma db push:', e.message);
  }
}

run('npm run build', 'backend');

// ── 2. FRONTEND SETUP (NEXT.JS EXPORT) ────────────────────────────────────────
console.log('\n[postinstall] === 2/4 FRONTEND setup ===');
run('npm run build', 'frontend');

const srcOut = path.join(process.cwd(), 'frontend', 'out');
const destOut = path.join(process.cwd(), 'out');
const localPublicHtml = path.join(process.cwd(), 'public_html');

if (fs.existsSync(srcOut)) {
  fs.mkdirSync(destOut, { recursive: true });
  copyDirSync(srcOut, destOut);
  fs.mkdirSync(localPublicHtml, { recursive: true });
  copyDirSync(srcOut, localPublicHtml);
  console.log('✅ [postinstall] Copiado frontend/out a ./out y ./public_html');
}

// Plantilla .htaccess principal
const rootHtaccess = `DirectoryIndex index.html index.php
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
  <FilesMatch "\\.(js|mjs|css|woff2|woff|ttf|svg|webp|png|jpg|jpeg|ico|json)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Enviar peticiones API a api/index.php
  RewriteRule ^api(/.*)?$ api/index.php [L,QSA]

  # 2. Enviar peticiones Admin a admin/index.php
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^admin(/.*)?$ admin/index.php [L,QSA]

  # 3. Servir archivos físicos existentes
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Fallback SPA Next.js
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>
`;

// Desplegar frontend a todos los webroots encontrados
for (const target of webroots.mainPublicHtml) {
  try {
    if (fs.existsSync(path.dirname(target))) {
      fs.mkdirSync(target, { recursive: true });
      if (fs.existsSync(path.join(target, 'default.php'))) {
        fs.unlinkSync(path.join(target, 'default.php'));
      }
      if (fs.existsSync(srcOut) && target !== srcOut) {
        copyDirSync(srcOut, target);
      }
      fs.writeFileSync(path.join(target, '.htaccess'), rootHtaccess.trim());
      fs.writeFileSync(path.join(target, '.node_port'), '4000');
      console.log(`✅ [postinstall] Frontend entregado en webroot: ${target}`);
    }
  } catch (err) {
    console.error(`Warning: Failed to copy frontend to ${target}:`, err.message);
  }
}

// ── 3. API SETUP (REVERSE PROXY & HTACCESS) ──────────────────────────────────
console.log('\n[postinstall] === 3/4 API Proxy setup ===');
const proxyFile = path.join(process.cwd(), 'proxy-api.php');
let proxyContent = '';
if (fs.existsSync(proxyFile)) {
  proxyContent = fs.readFileSync(proxyFile, 'utf8');
}

const proxyHtaccess = `Options -Indexes +FollowSymLinks
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>
`;

for (const apiTarget of webroots.apiPublicHtml) {
  try {
    if (fs.existsSync(path.dirname(apiTarget))) {
      fs.mkdirSync(apiTarget, { recursive: true });
      if (fs.existsSync(path.join(apiTarget, 'default.php'))) {
        fs.unlinkSync(path.join(apiTarget, 'default.php'));
      }
      if (proxyContent) {
        fs.writeFileSync(path.join(apiTarget, 'index.php'), proxyContent);
      }
      fs.writeFileSync(path.join(apiTarget, '.htaccess'), proxyHtaccess.trim());
      fs.writeFileSync(path.join(apiTarget, '.node_port'), '4000');
      console.log(`✅ [postinstall] API Proxy entregado en: ${apiTarget}`);
    }
  } catch (err) {
    console.error(`Warning: Failed to setup API in ${apiTarget}:`, err.message);
  }
}

// ── 4. ADMIN SETUP (ASSETS & REVERSE PROXY) ──────────────────────────────────
console.log('\n[postinstall] === 4/4 ADMIN setup ===');
run('npm run build', 'admin');

const adminPublicSrc = path.join(process.cwd(), 'admin', 'public');
const adminUploadsSrc = path.join(process.cwd(), 'admin', 'uploads');

const adminHtaccess = `Options -Indexes +FollowSymLinks
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule ^ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>
`;

for (const adminTarget of webroots.adminPublicHtml) {
  try {
    if (fs.existsSync(path.dirname(adminTarget))) {
      fs.mkdirSync(adminTarget, { recursive: true });
      if (fs.existsSync(path.join(adminTarget, 'default.php'))) {
        fs.unlinkSync(path.join(adminTarget, 'default.php'));
      }
      if (proxyContent) {
        fs.writeFileSync(path.join(adminTarget, 'index.php'), proxyContent);
      }
      fs.writeFileSync(path.join(adminTarget, '.htaccess'), adminHtaccess.trim());
      fs.writeFileSync(path.join(adminTarget, '.node_port'), '4000');

      // Copiar assets estáticos del panel admin
      if (fs.existsSync(adminPublicSrc)) {
        copyDirSync(adminPublicSrc, adminTarget);
        copyDirSync(adminPublicSrc, path.join(adminTarget, 'static'));
      }
      if (fs.existsSync(adminUploadsSrc)) {
        copyDirSync(adminUploadsSrc, path.join(adminTarget, 'uploads'));
        copyDirSync(adminUploadsSrc, path.join(path.dirname(adminTarget), 'uploads'));
      }
      console.log(`✅ [postinstall] Admin Proxy y Assets entregados en: ${adminTarget}`);
    }
  } catch (err) {
    console.error(`Warning: Failed to setup Admin in ${adminTarget}:`, err.message);
  }
}

// ── 5. SINCRONIZACIÓN A DIRECTORIOS DE RUNTIME (HBUILDS / CURRENT / NODEJS) ───
console.log('\n[postinstall] === Sincronizando con directorios de runtime de Node.js ===');
for (const runtimeTarget of webroots.runtimeDirs) {
  try {
    if (fs.existsSync(path.dirname(runtimeTarget))) {
      fs.mkdirSync(runtimeTarget, { recursive: true });
      const itemsToSync = ['server.js', 'package.json', 'out', 'frontend', 'admin', 'backend', '.env', '.node_port'];
      for (const item of itemsToSync) {
        const itemSrc = path.join(process.cwd(), item);
        const itemDest = path.join(runtimeTarget, item);
        if (fs.existsSync(itemSrc)) {
          if (fs.statSync(itemSrc).isDirectory()) {
            copyDirSync(itemSrc, itemDest);
          } else {
            fs.copyFileSync(itemSrc, itemDest);
          }
        }
      }
      console.log(`✅ [postinstall] Runtime sincronizado en: ${runtimeTarget}`);
    }
  } catch (_) {}
}

// Crear restart.txt para Passenger / LiteSpeed Node.js
const restartPaths = [
  path.join(process.cwd(), 'tmp', 'restart.txt'),
  path.join(localPublicHtml, 'tmp', 'restart.txt')
];
for (const rPath of restartPaths) {
  try {
    fs.mkdirSync(path.dirname(rPath), { recursive: true });
    fs.writeFileSync(rPath, String(Date.now()), 'utf8');
  } catch (_) {}
}

console.log('\n[postinstall] ✅ Monorepo preparado y entregado exitosamente.\n');
process.exit(0);
