// ==============================================================================
// postinstall.cjs — Monorepo Build & Webroot Setup para Hostinger
// Arquitectura agnóstica, limpia y portable
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n[postinstall] ==========================================');
console.log('[postinstall] Iniciando preparación del monorepo');
console.log('[postinstall] CWD:', process.cwd());
console.log('[postinstall] ==========================================\n');

function run(cmd, subdir) {
  const cwd = path.join(process.cwd(), subdir);
  if (!fs.existsSync(cwd)) return;
  console.log(`[postinstall] Ejecutando: "${cmd}" en ${subdir}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
    console.log(`[postinstall] ✅ Exitoso: "${cmd}" en ${subdir}`);
  } catch (err) {
    console.warn(`[postinstall] ⚠️ Warning en "${cmd}" (${subdir}):`, err.message);
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

// ── 1. PRISMA ORM & BACKEND ──────────────────────────────────────────────────
console.log('[postinstall] === 1/3 Generando cliente Prisma ORM ===');
try {
  execSync('npx prisma generate --schema=backend/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('✅ [postinstall] Cliente Prisma generado.');
} catch (e) {
  console.warn('⚠️ [postinstall] Warning prisma generate:', e.message);
}

if (process.env.DATABASE_URL) {
  try {
    console.log('> [postinstall] Sincronizando esquema de base de datos...');
    execSync('npx prisma db push --schema=backend/prisma/schema.prisma --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ [postinstall] Base de datos sincronizada.');
  } catch (e) {
    console.warn('⚠️ [postinstall] Warning prisma db push:', e.message);
  }
}

// Compilar TypeScript en backend y admin si no existen
const backendDist = path.resolve(process.cwd(), 'backend/dist/index.js');
const adminDist = path.resolve(process.cwd(), 'admin/dist/index.js');

if (!fs.existsSync(backendDist)) {
  run('npm run build', 'backend');
}
if (!fs.existsSync(adminDist)) {
  run('npm run build', 'admin');
}

// ── 2. PREPARAR CARPETA public_html ──────────────────────────────────────────
console.log('[postinstall] === 2/3 Ensamblando public_html con Frontend, Admin y API ===');
const rootDir = process.cwd();
const localPublicHtml = path.resolve(rootDir, 'public_html');
const frontendOut = path.resolve(rootDir, 'frontend/out');
const adminPublicDir = path.resolve(rootDir, 'admin/public');
const adminUploadsDir = path.resolve(rootDir, 'admin/uploads');

fs.mkdirSync(localPublicHtml, { recursive: true });
const localAdminDir = path.join(localPublicHtml, 'admin');
const localApiDir = path.join(localPublicHtml, 'api');
fs.mkdirSync(localAdminDir, { recursive: true });
fs.mkdirSync(localApiDir, { recursive: true });

// A. Copiar frontend estático
if (fs.existsSync(frontendOut)) {
  copyDirSync(frontendOut, localPublicHtml);
  const rootOut = path.join(rootDir, 'out');
  fs.mkdirSync(rootOut, { recursive: true });
  copyDirSync(frontendOut, rootOut);
}

// B. Copiar assets del Admin
if (fs.existsSync(adminPublicDir)) {
  copyDirSync(adminPublicDir, localAdminDir);
  copyDirSync(adminPublicDir, path.join(localAdminDir, 'static'));
}
if (fs.existsSync(adminUploadsDir)) {
  copyDirSync(adminUploadsDir, path.join(localPublicHtml, 'uploads'));
  copyDirSync(adminUploadsDir, path.join(localAdminDir, 'uploads'));
}

// C. Generar .htaccess limpio y agnóstico
const rootHtaccess = `
DirectoryIndex index.html index.php
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

  # 1. Enviar peticiones de API a api/index.php
  RewriteRule ^api(/.*)?$ api/index.php [L,QSA]

  # 2. Enviar peticiones de Admin a admin/index.php
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^admin(/.*)?$ admin/index.php [L,QSA]

  # 3. Servir archivos y directorios existentes
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Fallback SPA para Next.js
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>
`;

const subHtaccess = `
Options -Indexes +FollowSymLinks
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>
`;

fs.writeFileSync(path.join(localPublicHtml, '.htaccess'), rootHtaccess.trim());
fs.writeFileSync(path.join(localPublicHtml, '.node_port'), '4000');
fs.writeFileSync(path.join(localAdminDir, '.htaccess'), subHtaccess.trim());
fs.writeFileSync(path.join(localApiDir, '.htaccess'), subHtaccess.trim());

// D. Copiar proxy-api.php como index.php en api/ y admin/
const proxySrc = path.join(rootDir, 'proxy-api.php');
if (fs.existsSync(proxySrc)) {
  fs.copyFileSync(proxySrc, path.join(localPublicHtml, 'proxy-api.php'));
  fs.copyFileSync(proxySrc, path.join(localAdminDir, 'index.php'));
  fs.copyFileSync(proxySrc, path.join(localApiDir, 'index.php'));
}

// ── 3. SINCRONIZACIÓN WEBROOT (PATRÓN UNU-RAYMI) ───────────────────────────────
console.log('[postinstall] === 3/3 Sincronización portable de webroot ===');

function syncToWebroot(targetDir) {
  if (!fs.existsSync(targetDir) || path.resolve(targetDir) === path.resolve(localPublicHtml)) return;
  console.log(`📡 [Postinstall] Sincronizando hacia webroot: ${targetDir}`);
  try {
    copyDirSync(localPublicHtml, targetDir);
    if (fs.existsSync(frontendOut)) {
      copyDirSync(frontendOut, targetDir);
    }
    
    // Eliminar default.php de Hostinger si existe
    const defaultFiles = [
      path.join(targetDir, 'default.php'),
      path.join(targetDir, 'admin', 'default.php'),
      path.join(targetDir, 'api', 'default.php')
    ];
    for (const df of defaultFiles) {
      if (fs.existsSync(df)) {
        try { fs.unlinkSync(df); console.log(`[Postinstall] Removido ${df}`); } catch (_) {}
      }
    }
    console.log(`✅ [Postinstall] Webroot sincronizado en: ${targetDir}`);
  } catch (err) {
    console.warn(`⚠️ [Postinstall] Error sincronizando en ${targetDir}:`, err.message);
  }
}

// A. Búsqueda ascendente de public_html hacia arriba (árbol de directorios)
let currentDir = process.cwd();
for (let i = 0; i < 6; i++) {
  const candidate = path.join(currentDir, 'public_html');
  syncToWebroot(candidate);
  const parent = path.dirname(currentDir);
  if (parent === currentDir) break;
  currentDir = parent;
}

// B. Búsqueda en HOME de Hostinger si está definido
if (process.env.HOME) {
  syncToWebroot(path.join(process.env.HOME, 'public_html'));
}

// C. Crear/actualizar restart.txt para Passenger/LiteSpeed
const restartDirs = [
  path.join(rootDir, 'tmp'),
  path.join(localPublicHtml, 'tmp')
];
for (const rDir of restartDirs) {
  try {
    fs.mkdirSync(rDir, { recursive: true });
    fs.writeFileSync(path.join(rDir, 'restart.txt'), String(Date.now()), 'utf8');
  } catch (_) {}
}

console.log('\n[postinstall] ✅ Monorepo listo para ejecución y despliegue.\n');
process.exit(0);
