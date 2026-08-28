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
console.log('📦 [Sync Hostinger] Sincronización Total de Archivos a public_html');
console.log('================================================================');
console.log('   - Raíz del proyecto:', rootDir);

// Función de copia recursiva robusta que nunca falla
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
    } catch (e) {
      console.warn(`      ⚠️ Error copiando ${entry.name}:`, e.message);
    }
  }
}

// 1. Recopilar todos los posibles destinos de public_html en Hostinger
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

if (process.env.USER) {
  candidatePaths.push(`/home/${process.env.USER}/public_html`);
}
candidatePaths.push('/home/u251936581/public_html');

// Deduplicar
const targetDirs = Array.from(new Set(candidatePaths));

console.log('🎯 Directorios public_html detectados:');
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

    // A. Copiar archivos de frontendOut si existe (build reciente de Next.js)
    if (fs.existsSync(frontendOut)) {
      copyDirSync(frontendOut, dest);
    }

    // B. Copiar archivos estáticos de localPublicHtml (para asegurar que nada falte)
    if (fs.existsSync(localPublicHtml) && dest !== localPublicHtml) {
      copyDirSync(localPublicHtml, dest);
    }

    // C. Copiar archivos de frontend/public (logos, favicon, imágenes)
    if (fs.existsSync(frontendPublic)) {
      copyDirSync(frontendPublic, dest);
    }

    // D. Crear subdirectorios de subdominios
    const adminDir = path.join(dest, 'admin');
    const apiDir = path.join(dest, 'api');
    const uploadsDir = path.join(dest, 'uploads');

    fs.mkdirSync(adminDir, { recursive: true });
    fs.mkdirSync(apiDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });

    // E. Copiar uploads reales
    if (fs.existsSync(adminUploads)) {
      copyDirSync(adminUploads, uploadsDir);
    }

    // F. Escribir .htaccess en todos los niveles
    fs.writeFileSync(path.join(dest, '.htaccess'), rootHtaccess, 'utf8');
    fs.writeFileSync(path.join(adminDir, '.htaccess'), adminHtaccess, 'utf8');
    fs.writeFileSync(path.join(apiDir, '.htaccess'), apiHtaccess, 'utf8');

    console.log(`✅ [Sync Hostinger] Sincronizado exitosamente en: ${dest}`);
  } catch (err) {
    console.warn(`⚠️ [Sync Hostinger] No se pudo escribir en ${dest}:`, err.message);
  }
}

// Escribir .htaccess en la raíz del proyecto
try {
  fs.writeFileSync(path.join(rootDir, '.htaccess'), rootHtaccess, 'utf8');
} catch (_) {}

console.log('🏁 [Sync Hostinger] Sincronización finalizada correctamente.\n');
