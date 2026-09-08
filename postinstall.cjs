// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge Clean Build & Deploy
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const isLinux = process.platform === 'linux';

console.log('\n[deploy] ==========================================');
console.log('[deploy] Bearded Mountaineer Lodge: Build & Deploy');
console.log('[deploy] CWD:', ROOT);
console.log('[deploy] Platform:', process.platform);
console.log('[deploy] ==========================================\n');

// ── Cargar variables de entorno ───────────────────────────────────────────────
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
      if (!process.env[k]) process.env[k] = v;
    }
  } catch (_) {}
}

loadEnv(path.join(ROOT, '.env.production'));
loadEnv(path.join(ROOT, '.env'));

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://dummy:dummy@localhost:3306/dummy';
}
if (!process.env.NEXT_PUBLIC_API_URL) {
  process.env.NEXT_PUBLIC_API_URL = '/api';
}

function run(cmd, cwd) {
  const dir = cwd ? path.join(ROOT, cwd) : ROOT;
  console.log(`[deploy] → ${cmd} (${cwd || '.'})`);
  try {
    execSync(cmd, { cwd: dir, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
    return true;
  } catch (e) {
    console.error(`[deploy] ❌ Error en "${cmd}":`, e.message);
    return false;
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      try { fs.copyFileSync(s, d); } catch (_) {}
    }
  }
}

// ── 1. Prisma Generate ────────────────────────────────────────────────────────
console.log('\n[deploy] [1/4] Prisma Generate...');
try {
  const schema = path.join(ROOT, 'backend/prisma/schema.prisma');
  if (fs.existsSync(schema)) {
    const localPrisma = path.join(ROOT, 'node_modules/prisma/build/index.js');
    if (fs.existsSync(localPrisma)) {
      execSync(`node "${localPrisma}" generate --schema="${schema}"`, { stdio: 'inherit' });
    } else {
      execSync(`npx prisma generate --schema="${schema}"`, { stdio: 'inherit' });
    }
    console.log('[deploy] ✅ Prisma Client generado.');

    // Sincronizar Prisma Client generado a backend, admin y rutas runtime
    const prismaSrc = path.join(ROOT, 'node_modules/.prisma');
    if (fs.existsSync(prismaSrc)) {
      const pTargets = [
        path.join(ROOT, 'backend/node_modules/.prisma'),
        path.join(ROOT, 'admin/node_modules/.prisma'),
        '/home/u251936581/domains/beardedmountaineerlodge.com/node_modules/.prisma',
        '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs/node_modules/.prisma'
      ];
      pTargets.forEach(function(pt) {
        try {
          copyDir(prismaSrc, pt);
        } catch (_) {}
      });
      console.log('[deploy] ✅ Prisma Client sincronizado a entornos de ejecución.');
    }

    const prismaClientPkg = path.join(ROOT, 'node_modules/@prisma/client');
    if (fs.existsSync(prismaClientPkg)) {
      const pkgTargets = [
        path.join(ROOT, 'backend/node_modules/@prisma/client'),
        path.join(ROOT, 'admin/node_modules/@prisma/client')
      ];
      pkgTargets.forEach(function(pt) {
        try { copyDir(prismaClientPkg, pt); } catch (_) {}
      });
    }
  }
} catch (e) {
  console.warn('[deploy] ⚠️  Aviso Prisma generate:', e.message);
}

// ── 2. Build Backend ──────────────────────────────────────────────────────────
console.log('\n[deploy] [2/4] Compilando Backend...');
run('node scripts/build.cjs', 'backend');

// ── 3. Build Admin y Frontend (Next.js SSG) ───────────────────────────────────
const adminOutIndex = path.join(ROOT, 'admin/out/index.html');
if (fs.existsSync(adminOutIndex)) {
  console.log('\n[deploy] [3/4] admin/out/ ya existe y está listo (omitiendo compilación pesada)...');
} else {
  console.log('\n[deploy] [3/4] Compilando Admin (Next.js SSG)...');
  run('node scripts/build.cjs', 'admin');
}

const frontendOutIndex = path.join(ROOT, 'frontend/out/index.html');
if (fs.existsSync(frontendOutIndex)) {
  console.log('[deploy] [3/4] frontend/out/ ya existe y está listo (omitiendo compilación pesada)...');
} else {
  console.log('[deploy] [3/4] Compilando Frontend (Next.js SSG)...');
  run('node scripts/build.cjs', 'frontend');
}

// ── 4. Despliegue directo a Hostinger public_html ─────────────────────────────
console.log('\n[deploy] [4/4] Desplegando en public_html...');

const rootHtaccess = `DirectoryIndex index.html
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

  # 1. Redirección de subdominios si LiteSpeed los enruta al public_html principal
  RewriteCond %{HTTP_HOST} ^admin\\. [NC]
  RewriteRule ^(.*)$ https://beardedmountaineerlodge.com/admin/$1 [R=301,L]

  RewriteCond %{HTTP_HOST} ^api\\. [NC]
  RewriteRule ^(.*)$ https://beardedmountaineerlodge.com/api/$1 [R=307,L]

  # 2. Rutas de API y Uploads pasan directo a Node.js (Phusion Passenger)
  RewriteRule ^(api|uploads)(/.*)?$ - [L]

  # 3. Servir archivos estáticos físicos directamente desde disco (Frontend y Admin SSG)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Fallback SPA Next.js para rutas del frontend
  RewriteRule ^ index.html [L]
</IfModule>
`;

// Destino canónico oficial en Hostinger para Bearded Mountaineer Lodge
const HOSTINGER_PUBLIC_HTML = '/home/u251936581/domains/beardedmountaineerlodge.com/public_html';

function deployTo(targetDir) {
  // Sandbox Guard
  if (targetDir.includes('mycoandes') || targetDir === '/home/u251936581' || targetDir === '/home/u251936581/public_html') {
    console.error(`[deploy] 🛑 BLOQUEO DE SEGURIDAD: Destino no permitido: "${targetDir}"`);
    return false;
  }

  console.log(`[deploy] → Desplegando en: ${targetDir}`);
  try {
    fs.mkdirSync(targetDir, { recursive: true });

    // 1. Limpiar proxies obsoletos PHP en public_html
    const obsoleteFiles = [
      path.join(targetDir, 'api', 'index.php'),
      path.join(targetDir, 'api', '.htaccess'),
      path.join(targetDir, 'api', 'default.php'),
      path.join(targetDir, 'admin', 'index.php'),
      path.join(targetDir, 'admin', 'default.php'),
      path.join(targetDir, 'default.php')
    ];
    obsoleteFiles.forEach(function(f) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch (_) {}
      }
    });

    // 2. Copiar frontend estático (out)
    const frontendOut = path.join(ROOT, 'frontend/out');
    if (fs.existsSync(frontendOut)) {
      const nextDir = path.join(targetDir, '_next');
      if (fs.existsSync(nextDir)) fs.rmSync(nextDir, { recursive: true, force: true });
      copyDir(frontendOut, targetDir);
      console.log('  ✅ Frontend exportado copiado a public_html');
    }

    // 3. Copiar frontend public assets
    const frontendPub = path.join(ROOT, 'frontend/public');
    if (fs.existsSync(frontendPub)) {
      copyDir(frontendPub, targetDir);
      console.log('  ✅ Frontend public assets copiados a public_html');
    }

    // 4. Copiar Admin estático (Next.js out) a public_html/admin
    const adminOut = path.join(ROOT, 'admin/out');
    if (fs.existsSync(adminOut)) {
      const pubAdmin = path.join(targetDir, 'admin');
      if (fs.existsSync(pubAdmin)) {
        fs.rmSync(pubAdmin, { recursive: true, force: true });
      }
      fs.mkdirSync(pubAdmin, { recursive: true });
      copyDir(adminOut, pubAdmin);

      const adminHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /admin/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME}/index.html -f
RewriteRule ^(.*)$ $1/index.html [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L]
</IfModule>
`;
      fs.writeFileSync(path.join(pubAdmin, '.htaccess'), adminHtaccess.trim());
      console.log('  ✅ Admin estático (Next.js) copiado a public_html/admin con .htaccess SPA');
    }

    // 5. Limpiar .txt residuales de Next.js
    for (const f of fs.readdirSync(targetDir)) {
      if (f.startsWith('__next.') || (f.endsWith('.txt') && f !== 'robots.txt')) {
        try { fs.unlinkSync(path.join(targetDir, f)); } catch (_) {}
      }
    }

    // 5. Escribir .htaccess raíz limpio
    fs.writeFileSync(path.join(targetDir, '.htaccess'), rootHtaccess.trim());
    console.log('  ✅ .htaccess limpio instalado en public_html');

    // 6. Configurar redirección para subdominios admin. y api.
    const subAdminHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteRule ^(.*)$ https://beardedmountaineerlodge.com/admin/$1 [R=301,L]
</IfModule>
`;
    const subAdminIndexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Bearded Mountaineer Lodge Admin</title>
  <meta http-equiv="refresh" content="0;url=https://beardedmountaineerlodge.com/admin/">
  <script>window.location.replace("https://beardedmountaineerlodge.com/admin/");</script>
</head>
<body>
  <p>Redirigiendo a <a href="https://beardedmountaineerlodge.com/admin/">Bearded Mountaineer Lodge Admin</a>...</p>
</body>
</html>
`;
    const subAdminIndexPhp = `<?php
$uri = $_SERVER['REQUEST_URI'] ?? '/';
header("Location: https://beardedmountaineerlodge.com/admin" . $uri, true, 301);
exit;
`;

    const subApiHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteRule ^(.*)$ https://beardedmountaineerlodge.com/api/$1 [R=307,L]
</IfModule>
`;
    const subApiIndexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Bearded Mountaineer Lodge API</title>
  <meta http-equiv="refresh" content="0;url=https://beardedmountaineerlodge.com/api/">
  <script>window.location.replace("https://beardedmountaineerlodge.com/api/");</script>
</head>
<body>
  <p>Redirigiendo a <a href="https://beardedmountaineerlodge.com/api/">Bearded Mountaineer Lodge API</a>...</p>
</body>
</html>
`;
    const subApiIndexPhp = `<?php
$uri = $_SERVER['REQUEST_URI'] ?? '/';
header("Location: https://beardedmountaineerlodge.com/api" . $uri, true, 307);
exit;
`;

    function writeSubdomainFiles(folder, htaccess, html, php) {
      try {
        fs.mkdirSync(folder, { recursive: true });
        fs.writeFileSync(path.join(folder, '.htaccess'), htaccess.trim());
        fs.writeFileSync(path.join(folder, 'index.html'), html.trim());
        fs.writeFileSync(path.join(folder, 'index.php'), php.trim());
        console.log(`  ✅ Redirección instalada en: ${folder}`);
      } catch (e) {
        console.warn(`  ⚠️ No se pudo escribir en ${folder}:`, e.message);
      }
    }

    // Buscar y diagnosticar carpetas de dominios en Hostinger
    const domainsBase = '/home/u251936581/domains';
    if (fs.existsSync(domainsBase)) {
      try {
        const found = fs.readdirSync(domainsBase);
        console.log('  📂 Dominios encontrados en Hostinger:', found.join(', '));
      } catch (_) {}
    }

    // Rutas dedicadas donde Hostinger puede mapear los subdominios
    const adminTargets = [
      '/home/u251936581/domains/admin.beardedmountaineerlodge.com/public_html',
      '/home/u251936581/domains/admin.beardedmountaineerlodge.com',
      '/home/u251936581/domains/beardedmountaineerlodge.com/subdomains/admin',
      '/home/u251936581/subdomains/admin'
    ];
    adminTargets.forEach(function(p) {
      if (fs.existsSync(p) || fs.existsSync(path.dirname(p))) {
        writeSubdomainFiles(p, subAdminHtaccess, subAdminIndexHtml, subAdminIndexPhp);
      }
    });

    const apiTargets = [
      '/home/u251936581/domains/api.beardedmountaineerlodge.com/public_html',
      '/home/u251936581/domains/api.beardedmountaineerlodge.com',
      '/home/u251936581/domains/beardedmountaineerlodge.com/subdomains/api',
      '/home/u251936581/subdomains/api'
    ];
    apiTargets.forEach(function(p) {
      if (fs.existsSync(p) || fs.existsSync(path.dirname(p))) {
        writeSubdomainFiles(p, subApiHtaccess, subApiIndexHtml, subApiIndexPhp);
      }
    });

    console.log(`[deploy] ✅ Despliegue completado con éxito en: ${targetDir}\n`);
    return true;
  } catch (err) {
    console.error(`[deploy] ❌ Error en despliegue a ${targetDir}:`, err.message);
    return false;
  }
}

// Ejecutar en Linux (Hostinger)
if (isLinux) {
  deployTo(HOSTINGER_PUBLIC_HTML);
} else {
  console.log('[deploy] ℹ️  Entorno local (Windows): omitiendo copia a /home/u251936581.');
  console.log('[deploy] ℹ️  Builds listos para producción.');
}

// ── 5. Limpieza de caché residual en Hostinger ────────────────────────────────
if (isLinux) {
  try {
    execSync('npm cache clean --force 2>/dev/null || true', { stdio: 'ignore' });
    const userHome = process.env.HOME || '/home/u251936581';
    const cacheDir = path.join(userHome, '.cache');
    if (fs.existsSync(cacheDir)) {
      for (const d of ['next', 'turbo', 'yarn']) {
        const p = path.join(cacheDir, d);
        if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
      }
    }
    console.log('[deploy] ✅ Caché de Hostinger purgada.');
  } catch (_) {}
}

// ── 6. Reinicio de aplicación Node.js en Hostinger (Phusion Passenger) ────────
if (isLinux) {
  const restartPaths = [
    path.join(ROOT, 'tmp', 'restart.txt'),
    path.join(HOSTINGER_PUBLIC_HTML, 'tmp', 'restart.txt'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/tmp/restart.txt'
  ];
  for (const rp of restartPaths) {
    try {
      fs.mkdirSync(path.dirname(rp), { recursive: true });
      fs.writeFileSync(rp, String(Date.now()), 'utf8');
    } catch (_) {}
  }
  console.log('[deploy] ✅ Señal de reinicio enviada a Passenger (tmp/restart.txt).');
}

console.log('[deploy] ✅ Build & Deploy finalizado.\n');
