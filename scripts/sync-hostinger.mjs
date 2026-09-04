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

const subHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.php [L]
</IfModule>
`;

fs.writeFileSync(path.join(publicHtml, '.htaccess'), rootHtaccess, 'utf8');
fs.writeFileSync(path.join(adminDir, '.htaccess'), subHtaccess, 'utf8');
fs.writeFileSync(path.join(apiDir, '.htaccess'), subHtaccess, 'utf8');

// 6. Si estamos en el entorno de Hostinger, sincronizar hacia el public_html raíz de la cuenta
const candidateTargetPaths = [
  path.resolve(rootDir, '../../../public_html'),
  path.resolve(rootDir, '../../../../public_html'),
  path.resolve(rootDir, '../../public_html'),
  path.resolve(rootDir, '../public_html'),
  '/home/u251936581/public_html',
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html'
];

for (const target of candidateTargetPaths) {
  try {
    if (fs.existsSync(target) && path.resolve(target) !== path.resolve(publicHtml)) {
      console.log(`📡 [Sync Hostinger] Propagando archivos estáticos hacia ${target}...`);
      copyDirSync(publicHtml, target);
      // Asegurar que archivos clave como .htaccess se copien explícitamente
      const htaccessSrc = path.join(publicHtml, '.htaccess');
      const htaccessDest = path.join(target, '.htaccess');
      if (fs.existsSync(htaccessSrc)) {
        try { fs.copyFileSync(htaccessSrc, htaccessDest); } catch (_) {}
      }
      console.log(`✅ [Sync Hostinger] Propagado con éxito hacia: ${target}`);
    }
  } catch (err) {
    console.warn(`⚠️ [Sync Hostinger] No se pudo copiar a ${target}:`, err.message);
  }
}

console.log('✅ [Sync Hostinger] public_html sincronizado de forma limpia y precisa.');
