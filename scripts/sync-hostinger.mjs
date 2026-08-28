import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const localPublicHtml = path.join(rootDir, 'public_html');
const frontendOut = path.join(rootDir, 'apps/frontend/out');
const adminUploads = path.join(rootDir, 'apps/admin/uploads');

console.log('📦 [Sync Hostinger] Iniciando sincronización a directorios public_html...');
console.log('   - rootDir actual:', rootDir);

// 1. Recopilar todos los posibles destinos de public_html
const candidatePaths = [
  localPublicHtml,
  path.resolve(rootDir, '../../public_html'), // ~/public_html desde ~/hbuilds/last-source
  path.resolve(rootDir, '../../../public_html'),
  path.resolve(rootDir, '../public_html')
];

if (process.env.HOME) {
  candidatePaths.push(path.resolve(process.env.HOME, 'public_html'));
  
  // Buscar en dominios de Hostinger
  const domainsDir = path.resolve(process.env.HOME, 'domains');
  if (fs.existsSync(domainsDir)) {
    try {
      const domains = fs.readdirSync(domainsDir);
      for (const d of domains) {
        candidatePaths.push(path.resolve(domainsDir, d, 'public_html'));
      }
    } catch (_) {}
  }
}

// Fallback común para Hostinger
if (process.env.USER) {
  candidatePaths.push(`/home/${process.env.USER}/public_html`);
}
candidatePaths.push('/home/u251936581/public_html');

// Deduplicar
const targetDirs = Array.from(new Set(candidatePaths));

console.log('🎯 Directorios objetivo detectados:');
targetDirs.forEach(d => console.log('   👉 ' + d));

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

for (const dest of targetDirs) {
  try {
    fs.mkdirSync(dest, { recursive: true });

    // Copiar desde localPublicHtml o frontendOut
    if (fs.existsSync(localPublicHtml) && dest !== localPublicHtml) {
      fs.cpSync(localPublicHtml, dest, { recursive: true });
    } else if (fs.existsSync(frontendOut)) {
      fs.cpSync(frontendOut, dest, { recursive: true });
    }

    // Asegurar subdirectorios
    const adminDir = path.join(dest, 'admin');
    const apiDir = path.join(dest, 'api');
    const uploadsDir = path.join(dest, 'uploads');

    fs.mkdirSync(adminDir, { recursive: true });
    fs.mkdirSync(apiDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Sincronizar uploads
    if (fs.existsSync(adminUploads)) {
      fs.cpSync(adminUploads, uploadsDir, { recursive: true });
    }

    // Escribir .htaccess
    fs.writeFileSync(path.join(dest, '.htaccess'), rootHtaccess, 'utf8');
    fs.writeFileSync(path.join(adminDir, '.htaccess'), adminHtaccess, 'utf8');
    fs.writeFileSync(path.join(apiDir, '.htaccess'), apiHtaccess, 'utf8');

    console.log(`✅ [Sync Hostinger] Sincronizado exitosamente en: ${dest}`);
  } catch (err) {
    console.warn(`⚠️ [Sync Hostinger] No se pudo escribir en ${dest}:`, err.message);
  }
}

// También escribir .htaccess en la raíz del proyecto
try {
  fs.writeFileSync(path.join(rootDir, '.htaccess'), rootHtaccess, 'utf8');
} catch (_) {}
