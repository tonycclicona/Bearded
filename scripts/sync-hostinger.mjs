import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const frontendOut = path.join(rootDir, 'apps/frontend/out');
const adminUploads = path.join(rootDir, 'apps/admin/uploads');
const localPublicHtml = path.join(rootDir, 'public_html');

// Posibles ubicaciones de public_html en Hostinger
const targetDirs = [localPublicHtml];

// Si el repo fue clonado en un subdirectorio (ej: ~/bearded), detectar ~/public_html
const parentPublicHtml = path.join(rootDir, '..', 'public_html');
if (fs.existsSync(parentPublicHtml) && parentPublicHtml !== localPublicHtml) {
  targetDirs.push(parentPublicHtml);
}

const grandParentPublicHtml = path.join(rootDir, '..', '..', 'public_html');
if (fs.existsSync(grandParentPublicHtml) && !targetDirs.includes(grandParentPublicHtml)) {
  targetDirs.push(grandParentPublicHtml);
}

console.log('📦 [Sync Hostinger] Sincronizando en las siguientes carpetas public_html:', targetDirs);

const rootHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Servir archivos estáticos reales directamente
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 2. Enrutar /api y /admin a la aplicación Node.js (Gateway en puerto 8080 o el asignado por Hostinger)
  RewriteCond %{HTTP_HOST} ^api\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  RewriteCond %{HTTP_HOST} ^admin\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/admin [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  # 3. Fallback de Next.js SPA
  RewriteRule ^foto/.*$ /foto/[slug]/index.html [L]
  RewriteRule ^.*$ /index.html [L]
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

for (const pDir of targetDirs) {
  try {
    fs.mkdirSync(pDir, { recursive: true });
    const adminDir = path.join(pDir, 'admin');
    const apiDir = path.join(pDir, 'api');
    const uploadsDir = path.join(pDir, 'uploads');

    fs.mkdirSync(adminDir, { recursive: true });
    fs.mkdirSync(apiDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Copiar frontend estático
    if (fs.existsSync(frontendOut)) {
      fs.cpSync(frontendOut, pDir, { recursive: true });
    }

    // Copiar uploads
    if (fs.existsSync(adminUploads)) {
      fs.cpSync(adminUploads, uploadsDir, { recursive: true });
    }

    // Escribir archivos .htaccess
    fs.writeFileSync(path.join(pDir, '.htaccess'), rootHtaccess, 'utf8');
    fs.writeFileSync(path.join(adminDir, '.htaccess'), adminHtaccess, 'utf8');
    fs.writeFileSync(path.join(apiDir, '.htaccess'), apiHtaccess, 'utf8');

    console.log(`✅ [Sync Hostinger] Sincronizado exitosamente en: ${pDir}`);
  } catch (err) {
    console.error(`❌ [Sync Hostinger] Error sincronizando en ${pDir}:`, err.message);
  }
}

// También escribir .htaccess en la raíz del proyecto
fs.writeFileSync(path.join(rootDir, '.htaccess'), rootHtaccess, 'utf8');
