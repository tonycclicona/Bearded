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

const rootHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Rutas de la API -> Reenviar a Node.js en puerto 8080
  RewriteCond %{HTTP_HOST} ^api\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  # 2. Rutas del Admin -> Reenviar a Node.js en puerto 8080
  RewriteCond %{HTTP_HOST} ^admin\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/admin [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  # 3. Servir archivos estáticos reales directamente
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Fallback de Next.js SPA
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
