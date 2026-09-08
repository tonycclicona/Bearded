// ==============================================================================
// deploy-local.cjs — Genera public_html/ en local (equivalente a deploy.sh)
// Compatible con Windows. Ejecutar después de npm run build:all
// Uso: node deployment/deploy-local.cjs
//      o bien: npm run deploy:local
//
// ⚠️  MIGRACIONES DE BASE DE DATOS:
//   Este script NO ejecuta migraciones (requieren acceso al servidor de producción).
//   Las migraciones deben ejecutarse EN EL SERVIDOR DE HOSTINGER:
//     npx prisma migrate deploy --schema=backend/prisma/schema.prisma
//   Ejecutar ANTES de reiniciar la aplicación Node.js.
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_HTML = path.join(ROOT, 'public_html');
const FRONTEND_OUT = path.join(ROOT, 'frontend', 'out');
const PROXY_SRC = path.join(__dirname, 'proxy-api.php');
const NODE_PORT = process.env.GATEWAY_PORT || '4000';

console.log('\n[deploy-local] Bearded Mountaineer Lodge — Local Deploy');
console.log('[deploy-local] public_html:', PUBLIC_HTML);

// ── Validaciones ──────────────────────────────────────────────────────────────
if (!fs.existsSync(FRONTEND_OUT) || !fs.existsSync(path.join(FRONTEND_OUT, 'index.html'))) {
  console.error('[deploy-local] ❌ frontend/out/index.html no encontrado.');
  console.error('   Ejecuta primero: npm run build:all');
  process.exit(1);
}
if (!fs.existsSync(PROXY_SRC)) {
  console.error('[deploy-local] ❌ deployment/proxy-api.php no encontrado.');
  process.exit(1);
}

// ── Crear directorios ─────────────────────────────────────────────────────────
fs.mkdirSync(PUBLIC_HTML, { recursive: true });
fs.mkdirSync(path.join(PUBLIC_HTML, 'api'), { recursive: true });
fs.mkdirSync(path.join(PUBLIC_HTML, 'admin'), { recursive: true });
console.log('[deploy-local] ✅ Directorios creados');

// ── Limpiar _next/ anterior (para evitar chunks obsoletos) ────────────────────
const nextDir = path.join(PUBLIC_HTML, '_next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
}

// ── Copiar frontend/out/ → public_html/ ──────────────────────────────────────
fs.cpSync(FRONTEND_OUT, PUBLIC_HTML, { recursive: true });
const defaultPhp = path.join(PUBLIC_HTML, 'default.php');
if (fs.existsSync(defaultPhp)) fs.unlinkSync(defaultPhp);
console.log('[deploy-local] ✅ Frontend copiado a public_html/');

// ── Generar .htaccess raíz ────────────────────────────────────────────────────
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

  # 0. No reescribir peticiones del proxy inverso interno
  RewriteCond %{HTTP:X-Bypass-Proxy} 1
  RewriteRule ^ - [L]

  # 1. Subdominio API -> proxy PHP
  RewriteCond %{HTTP_HOST} ^api\\. [NC]
  RewriteRule ^(.*)$ api/index.php [L,QSA]

  # 2. Subdominio Admin -> proxy PHP
  RewriteCond %{HTTP_HOST} ^admin\\. [NC]
  RewriteCond %{REQUEST_URI} !^/static/ [NC]
  RewriteCond %{REQUEST_URI} !^/uploads/ [NC]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^(.*)$ admin/index.php [L,QSA]

  # 3. Ruta /api/* -> proxy PHP
  RewriteRule ^api(/.*)?$ api/index.php [L,QSA]

  # 4. Ruta /admin/* -> proxy PHP
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^admin(/.*)?$ admin/index.php [L,QSA]

  # 5. Archivos fisicos existentes
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 6. Fallback SPA (Next.js static export)
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>`;

fs.writeFileSync(path.join(PUBLIC_HTML, '.htaccess'), htaccessRoot);
fs.writeFileSync(path.join(PUBLIC_HTML, '.node_port'), NODE_PORT);
console.log('[deploy-local] ✅ .htaccess y .node_port generados');

// ── Proxy API ─────────────────────────────────────────────────────────────────
fs.copyFileSync(PROXY_SRC, path.join(PUBLIC_HTML, 'api', 'index.php'));
fs.writeFileSync(path.join(PUBLIC_HTML, 'api', '.node_port'), NODE_PORT);
fs.writeFileSync(path.join(PUBLIC_HTML, 'api', '.htaccess'), `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>`);
console.log('[deploy-local] ✅ public_html/api/index.php configurado');

// ── Proxy Admin ───────────────────────────────────────────────────────────────
fs.copyFileSync(PROXY_SRC, path.join(PUBLIC_HTML, 'admin', 'index.php'));
fs.writeFileSync(path.join(PUBLIC_HTML, 'admin', '.node_port'), NODE_PORT);
fs.writeFileSync(path.join(PUBLIC_HTML, 'admin', '.htaccess'), `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>`);
console.log('[deploy-local] ✅ public_html/admin/index.php configurado');

// ── Resumen ───────────────────────────────────────────────────────────────────
const checks = [
  path.join(PUBLIC_HTML, 'index.html'),
  path.join(PUBLIC_HTML, '_next'),
  path.join(PUBLIC_HTML, '.htaccess'),
  path.join(PUBLIC_HTML, 'api', 'index.php'),
  path.join(PUBLIC_HTML, 'admin', 'index.php'),
];
let ok = true;
for (const c of checks) {
  if (fs.existsSync(c)) {
    console.log(`[deploy-local] ✅ ${path.relative(ROOT, c)}`);
  } else {
    console.error(`[deploy-local] ❌ FALTA: ${path.relative(ROOT, c)}`);
    ok = false;
  }
}

if (ok) {
  console.log('\n[deploy-local] ✅ public_html/ lista para subir a Hostinger.');
  console.log('\n[deploy-local] ⚠️  PASOS OBLIGATORIOS EN EL SERVIDOR HOSTINGER:');
  console.log('  1. Subir los archivos del proyecto (sin node_modules)');
  console.log('  2. npm ci --omit=dev');
  console.log('  3. npx prisma migrate deploy --schema=backend/prisma/schema.prisma  ← MIGRACIONES');
  console.log('  4. Subir public_html/ al servidor');
  console.log('  5. Reiniciar la aplicación Node.js en el panel de Hostinger\n');
} else {
  console.error('\n[deploy-local] ❌ Hay archivos faltantes. Revisa los errores.\n');
  process.exit(1);
}
