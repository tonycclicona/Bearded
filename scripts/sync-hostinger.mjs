import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const publicHtml = path.join(rootDir, 'public_html');
const frontendOut = path.join(rootDir, 'apps/frontend/out');
const frontendPublic = path.join(rootDir, 'apps/frontend/public');
const adminUploads = path.join(rootDir, 'apps/admin/uploads');

console.log('📦 [Sync Hostinger] Sincronizando carpeta public_html dentro del proyecto...');

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

// 1. Asegurar directorios de public_html
fs.mkdirSync(publicHtml, { recursive: true });
const adminDir = path.join(publicHtml, 'admin');
const apiDir = path.join(publicHtml, 'api');
const uploadsDir = path.join(publicHtml, 'uploads');

fs.mkdirSync(adminDir, { recursive: true });
fs.mkdirSync(apiDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// 2. Copiar archivos compilados de Next.js
if (fs.existsSync(frontendOut)) {
  copyDirSync(frontendOut, publicHtml);
}

// 3. Copiar assets públicos
if (fs.existsSync(frontendPublic)) {
  copyDirSync(frontendPublic, publicHtml);
}

// 4. Copiar uploads
if (fs.existsSync(adminUploads)) {
  copyDirSync(adminUploads, uploadsDir);
}

// 5. Generar reglas .htaccess
const rootHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Reenviar subdominio API o prefijo /api al servidor Node.js en hbuilds
  RewriteCond %{HTTP_HOST} ^api\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  # 2. Reenviar subdominio Admin o prefijo /admin al servidor Node.js en hbuilds
  RewriteCond %{HTTP_HOST} ^admin\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/admin [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  # 3. Servir archivos estáticos reales directamente si existen
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Enrutar todo el Frontend al servidor Node.js (hbuilds/current/nodejs)
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]
</IfModule>
`;

const adminHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^(.*)$ http://127.0.0.1:8080/admin/$1 [P,L]
</IfModule>
`;

const apiHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^(.*)$ http://127.0.0.1:8080/api/$1 [P,L]
</IfModule>
`;

fs.writeFileSync(path.join(publicHtml, '.htaccess'), rootHtaccess, 'utf8');
fs.writeFileSync(path.join(adminDir, '.htaccess'), adminHtaccess, 'utf8');
fs.writeFileSync(path.join(apiDir, '.htaccess'), apiHtaccess, 'utf8');

console.log('✅ [Sync Hostinger] public_html sincronizado de forma limpia y precisa.');
