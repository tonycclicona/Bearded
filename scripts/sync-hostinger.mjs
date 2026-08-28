import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const localPublicHtml = path.join(rootDir, 'public_html');
const frontendOut = path.join(rootDir, 'apps/frontend/out');
const frontendPublic = path.join(rootDir, 'apps/frontend/public');
const adminUploads = path.join(rootDir, 'apps/admin/uploads');

console.log('================================================================');
console.log('📦 [Sync Hostinger] Sincronización a Raíz del Repositorio y public_html');
console.log('================================================================');

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

const rootHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Servir archivos estáticos reales directamente
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 2. Enrutar /api y /admin a la aplicación Node.js
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

// Lista de destinos donde debe residir la estructura web
const targetDirs = [
  rootDir,            // Raíz del repositorio (para que el deploy de Hostinger lo copie a public_html)
  localPublicHtml,    // Subcarpeta public_html
  path.resolve(rootDir, '../../public_html'), // ~/public_html de Hostinger
  path.resolve(rootDir, '../public_html')
];

if (process.env.HOME) {
  targetDirs.push(path.resolve(process.env.HOME, 'public_html'));
}
targetDirs.push('/home/u251936581/public_html');

const uniqueTargets = Array.from(new Set(targetDirs));

for (const dest of uniqueTargets) {
  try {
    fs.mkdirSync(dest, { recursive: true });

    // Copiar desde frontendOut si existe
    if (fs.existsSync(frontendOut)) {
      copyDirSync(frontendOut, dest);
    } else if (fs.existsSync(localPublicHtml) && dest !== localPublicHtml) {
      copyDirSync(localPublicHtml, dest);
    }

    if (fs.existsSync(frontendPublic)) {
      copyDirSync(frontendPublic, dest);
    }

    const adminDir = path.join(dest, 'admin');
    const apiDir = path.join(dest, 'api');
    const uploadsDir = path.join(dest, 'uploads');

    fs.mkdirSync(adminDir, { recursive: true });
    fs.mkdirSync(apiDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });

    if (fs.existsSync(adminUploads)) {
      copyDirSync(adminUploads, uploadsDir);
    }

    fs.writeFileSync(path.join(dest, '.htaccess'), rootHtaccess, 'utf8');
    fs.writeFileSync(path.join(adminDir, '.htaccess'), adminHtaccess, 'utf8');
    fs.writeFileSync(path.join(apiDir, '.htaccess'), apiHtaccess, 'utf8');

    console.log(`✅ [Sync Hostinger] Sincronizado en: ${dest}`);
  } catch (e) {
    console.warn(`⚠️ [Sync Hostinger] Salto en ${dest}:`, e.message);
  }
}

console.log('🏁 [Sync Hostinger] Sincronización completada.\n');
