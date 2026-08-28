import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const frontendOut = path.join(rootDir, 'apps/frontend/out');
const adminUploads = path.join(rootDir, 'apps/admin/uploads');
const localPublicHtml = path.join(rootDir, 'public_html');

// Recopilar todas las posibles ubicaciones reales de public_html en Hostinger
const candidatePaths = [
  localPublicHtml,
  path.resolve(rootDir, '../public_html'),
  path.resolve(rootDir, '../../public_html'), // ~/public_html cuando está en ~/hbuilds/last-source
  path.resolve(rootDir, '../../../public_html')
];

if (process.env.HOME) {
  candidatePaths.push(path.resolve(process.env.HOME, 'public_html'));
  
  // Buscar en subdominios/dominios de Hostinger
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

// Filtrar rutas únicas
const targetDirs = Array.from(new Set(candidatePaths));

console.log('📦 [Sync Hostinger] Sincronizando en las siguientes carpetas objetivo:');
targetDirs.forEach(d => console.log('   👉 ' + d));

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
    // Si la carpeta existe o es la ruta directa de public_html
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
    console.warn(`⚠️ [Sync Hostinger] No se pudo escribir en ${pDir}:`, err.message);
  }
}

// También escribir .htaccess en la raíz del proyecto
fs.writeFileSync(path.join(rootDir, '.htaccess'), rootHtaccess, 'utf8');
