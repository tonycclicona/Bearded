import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const frontendOut = path.join(rootDir, 'apps/frontend/out');
const adminUploads = path.join(rootDir, 'apps/admin/uploads');
const adminPublic = path.join(rootDir, 'apps/admin/public');
const publicHtml = path.join(rootDir, 'public_html');

console.log('📦 [Sync Hostinger] Sincronizando estructura idéntica a producción en public_html/...');

// 1. Crear directorios base
fs.mkdirSync(publicHtml, { recursive: true });
const adminDir = path.join(publicHtml, 'admin');
const apiDir = path.join(publicHtml, 'api');
const uploadsDir = path.join(publicHtml, 'uploads');

fs.mkdirSync(adminDir, { recursive: true });
fs.mkdirSync(apiDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// 2. Copiar build del Frontend estático a public_html/
if (fs.existsSync(frontendOut)) {
  fs.cpSync(frontendOut, publicHtml, { recursive: true });
  console.log('✅ [Sync Hostinger] Frontend estático copiado a public_html/');
} else {
  console.warn('⚠️ [Sync Hostinger] apps/frontend/out no encontrado.');
}

// 3. Sincronizar carpeta uploads
if (fs.existsSync(adminUploads)) {
  fs.cpSync(adminUploads, uploadsDir, { recursive: true });
  console.log('✅ [Sync Hostinger] Carpeta uploads sincronizada en public_html/uploads/');
}

// 4. Generar .htaccess principal (public_html/.htaccess)
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

fs.writeFileSync(path.join(publicHtml, '.htaccess'), rootHtaccess, 'utf8');
fs.writeFileSync(path.join(rootDir, '.htaccess'), rootHtaccess, 'utf8');

// 5. Generar .htaccess y placeholder para el subdominio admin (public_html/admin/.htaccess)
const adminHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Servir archivos estáticos si existen en admin
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Reenviar todas las peticiones del subdominio admin al Gateway Node.js
  RewriteRule ^(.*)$ http://127.0.0.1:8080/admin/$1 [P,L]
</IfModule>
`;
fs.writeFileSync(path.join(adminDir, '.htaccess'), adminHtaccess, 'utf8');

// 6. Generar .htaccess para el subdominio api (public_html/api/.htaccess)
const apiHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Servir archivos estáticos si existen en api
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Reenviar todas las peticiones del subdominio api al Gateway Node.js
  RewriteRule ^(.*)$ http://127.0.0.1:8080/api/$1 [P,L]
</IfModule>
`;
fs.writeFileSync(path.join(apiDir, '.htaccess'), apiHtaccess, 'utf8');

console.log('✅ [Sync Hostinger] Estructura public_html/ completada exitosamente:');
console.log('   📁 public_html/404');
console.log('   📁 public_html/_next');
console.log('   📁 public_html/_not-found');
console.log('   📁 public_html/admin (con .htaccess)');
console.log('   📁 public_html/api   (con .htaccess)');
console.log('   📁 public_html/uploads');
console.log('   📄 public_html/.htaccess');
console.log('   📄 public_html/index.html');
console.log('   📄 public_html/404.html');
