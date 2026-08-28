import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const frontendOut = path.join(rootDir, 'apps/frontend/out');
const publicHtml = path.join(rootDir, 'public_html');

console.log('📦 [Sync Hostinger] Sincronizando archivos estáticos para Hostinger...');

if (fs.existsSync(frontendOut)) {
  fs.mkdirSync(publicHtml, { recursive: true });
  fs.cpSync(frontendOut, publicHtml, { recursive: true });
  console.log('✅ [Sync Hostinger] Archivos de apps/frontend/out copiados a public_html/');
} else {
  console.warn('⚠️ [Sync Hostinger] apps/frontend/out no encontrado. Ejecute npm run build:frontend primero.');
}

// Crear .htaccess en public_html
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Servir archivos estáticos si existen
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Fallback a index.html para rutas SPA
  RewriteRule ^foto/.*$ /foto/[slug]/index.html [L]
  RewriteRule ^.*$ /index.html [L]
</IfModule>
`;

fs.writeFileSync(path.join(publicHtml, '.htaccess'), htaccessContent, 'utf8');
fs.writeFileSync(path.join(rootDir, '.htaccess'), htaccessContent, 'utf8');
console.log('✅ [Sync Hostinger] .htaccess generado correctamente en public_html/ y en la raíz.');
