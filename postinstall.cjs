'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 [Postinstall] Iniciando preparación de producción para Hostinger...');

// 1. Generar cliente Prisma
try {
  console.log('> [Postinstall] Generando cliente Prisma ORM...');
  execSync('npx prisma generate --schema=apps/backend/prisma/schema.prisma', { stdio: 'inherit' });
} catch (e) {
  console.warn('> [Postinstall] Warning prisma generate:', e.message);
}

// 2. Definir directorios
const rootDir = __dirname;
const frontendOut = path.resolve(rootDir, 'apps/frontend/out');
const localPublicHtml = path.resolve(rootDir, 'public_html');
const adminUploads = path.resolve(rootDir, 'apps/admin/uploads');

const targets = [
  localPublicHtml,
  '/home/u251936581/public_html',
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html'
];

if (process.env.HOME) {
  targets.push(path.resolve(process.env.HOME, 'public_html'));
}

const uniqueTargets = Array.from(new Set(targets));

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
    } catch (e) {}
  }
}

const rootHtaccess = `<IfModule mod_mime.c>
  AddType text/css .css
  AddType application/javascript .js .mjs
  AddType application/json .json
  AddType font/woff2 .woff2
  AddType font/woff .woff
  AddType font/ttf .ttf
  AddType image/svg+xml .svg
  AddType image/webp .webp
  AddType image/png .png
  AddType image/jpeg .jpg .jpeg
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

  # 1. API Subdomain / Rutas -> Reenviar a Node.js
  RewriteCond %{HTTP_HOST} ^api\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  # 2. Admin Subdomain / Rutas -> Reenviar a Node.js
  RewriteCond %{HTTP_HOST} ^admin\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/admin [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  # 3. Acceso directo a _next/ y uploads/ (NUNCA REESCRIBIR A index.html)
  RewriteRule ^_next/ - [L]
  RewriteRule ^uploads/ - [L]

  # 4. Servir archivos estáticos reales directamente si existen
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 5. Fallback de Next.js SPA
  RewriteRule ^foto/.*$ /foto/[slug]/index.html [L]
  RewriteRule ^.*$ /index.html [L]
</IfModule>
`;

uniqueTargets.forEach(dest => {
  try {
    fs.mkdirSync(dest, { recursive: true });
    
    // Copiar frontend
    if (fs.existsSync(frontendOut)) {
      copyDirSync(frontendOut, dest);
    } else if (fs.existsSync(localPublicHtml) && dest !== localPublicHtml) {
      copyDirSync(localPublicHtml, dest);
    }

    // Copiar uploads
    if (fs.existsSync(adminUploads)) {
      const upDest = path.join(dest, 'uploads');
      fs.mkdirSync(upDest, { recursive: true });
      copyDirSync(adminUploads, upDest);
    }

    // Escribir .htaccess
    fs.writeFileSync(path.join(dest, '.htaccess'), rootHtaccess, 'utf8');
    console.log('> [Postinstall] Sincronizado exitosamente en:', dest);
  } catch (err) {
    console.warn('> [Postinstall] Salto en:', dest, err.message);
  }
});

console.log('✅ [Postinstall] Despliegue completado con éxito.');
