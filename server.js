/**
 * Servidor Unificado In-Process & Auto-Sync Engine — BEARDED MOUNTAINEER LODGE
 * Especialmente optimizado para Hostinger (Carpeta única / WebApp única / Git Auto-Deploy)
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Señal para que backend y admin no abran listeners de puerto duplicados
process.env.UNIFIED_SERVER = 'true';

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 8080;

const frontendOutDir = path.join(__dirname, 'apps/frontend/out');
const uploadsDir = path.join(__dirname, 'apps/admin/uploads');
const adminPublicDir = path.join(__dirname, 'apps/admin/public');
const localPublicHtml = path.join(__dirname, 'public_html');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Función de copia recursiva robusta
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

// Función de Auto-Sincronización que restaura public_html permanentemente al arrancar
function syncToPublicHtml() {
  const candidatePaths = [
    localPublicHtml,
    path.resolve(__dirname, '../../public_html'), // ~/public_html desde ~/hbuilds/last-source
    path.resolve(__dirname, '../../../public_html'),
    path.resolve(__dirname, '../public_html')
  ];

  if (process.env.HOME) {
    candidatePaths.push(path.resolve(process.env.HOME, 'public_html'));
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

  const targetDirs = Array.from(new Set(candidatePaths));

  for (const dest of targetDirs) {
    try {
      fs.mkdirSync(dest, { recursive: true });

      if (fs.existsSync(frontendOutDir)) {
        copyDirSync(frontendOutDir, dest);
      }
      if (fs.existsSync(localPublicHtml) && dest !== localPublicHtml) {
        copyDirSync(localPublicHtml, dest);
      }

      const adminDir = path.join(dest, 'admin');
      const apiDir = path.join(dest, 'api');
      const upDir = path.join(dest, 'uploads');

      fs.mkdirSync(adminDir, { recursive: true });
      fs.mkdirSync(apiDir, { recursive: true });
      fs.mkdirSync(upDir, { recursive: true });

      if (fs.existsSync(uploadsDir)) {
        copyDirSync(uploadsDir, upDir);
      }

      fs.writeFileSync(path.join(dest, '.htaccess'), rootHtaccess, 'utf8');
      fs.writeFileSync(path.join(adminDir, '.htaccess'), adminHtaccess, 'utf8');
      fs.writeFileSync(path.join(apiDir, '.htaccess'), apiHtaccess, 'utf8');
    } catch (_) {}
  }
}

// Ejecutar sincronización al iniciar el servidor
syncToPublicHtml();

// 1. Archivos estáticos globales (Uploads e Iconos)
app.use('/admin/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));
app.use('/admin/static', express.static(adminPublicDir));
app.use('/static', express.static(adminPublicDir));

// 2. Health check del Gateway
app.get('/gateway-health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    domains: {
      frontend: 'https://beardedmountaineerlodge.com',
      admin: 'https://admin.beardedmountaineerlodge.com',
      api: 'https://api.beardedmountaineerlodge.com'
    },
    frontendExportExists: fs.existsSync(frontendOutDir),
    uploadsDirExists: fs.existsSync(uploadsDir)
  });
});

// Endpoint especial para forzar re-sincronización de public_html
app.get('/sync-public', (_req, res) => {
  syncToPublicHtml();
  res.json({ status: 'ok', message: 'public_html sincronizado con éxito' });
});

// 3. Cargar dinámicamente Backend y Admin in-process
let backendApp = null;
let adminApp = null;

try {
  const backendModule = await import('./apps/backend/dist/index.js');
  backendApp = backendModule.default || backendModule;
  console.log('✅ [Unified Server] Backend REST API cargado in-process.');
} catch (e) {
  console.error('❌ [Unified Server] Error cargando Backend API:', e.message);
}

try {
  const adminModule = await import('./apps/admin/dist/index.js');
  adminApp = adminModule.default || adminModule;
  console.log('✅ [Unified Server] Admin Panel EJS cargado in-process.');
} catch (e) {
  console.error('❌ [Unified Server] Error cargando Admin Panel:', e.message);
}

// 4. Enrutamiento Unificado por Subdominio y Rutas
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();

  // A. Subdominio api.beardedmountaineerlodge.com o prefijo /api
  if (host.startsWith('api.') || req.path.startsWith('/api')) {
    if (backendApp) {
      return backendApp(req, res, next);
    }
    return res.status(503).json({ error: 'Backend no disponible' });
  }

  // B. Subdominio admin.beardedmountaineerlodge.com o prefijo /admin
  if (host.startsWith('admin.') || req.path.startsWith('/admin')) {
    if (adminApp) {
      return adminApp(req, res, next);
    }
    return res.status(503).send('<h3>Panel Admin no disponible</h3>');
  }

  next();
});

// 5. Frontend Next.js (Servido directamente desde apps/frontend/out o public_html)
const sourceStaticDir = fs.existsSync(frontendOutDir) ? frontendOutDir : localPublicHtml;

if (fs.existsSync(sourceStaticDir)) {
  console.log(`✅ [Unified Server] Frontend montado desde: ${sourceStaticDir}`);
  app.use(express.static(sourceStaticDir));
  
  app.get('*', (req, res) => {
    const directPath = path.join(sourceStaticDir, req.path);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
      return res.sendFile(directPath);
    }

    const htmlPath = path.join(sourceStaticDir, `${req.path.replace(/\/$/, '')}.html`);
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }

    const subIndexPath = path.join(sourceStaticDir, req.path, 'index.html');
    if (fs.existsSync(subIndexPath)) {
      return res.sendFile(subIndexPath);
    }

    const mainIndex = path.join(sourceStaticDir, 'index.html');
    if (fs.existsSync(mainIndex)) {
      return res.sendFile(mainIndex);
    }

    res.status(404).send('Página no encontrada');
  });
} else {
  app.get('*', (_req, res) => {
    res.status(503).send('<h3>Plataforma en mantenimiento... Ejecute npm run build en Hostinger.</h3>');
  });
}

// 6. Iniciar Servidor
app.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`🦅 BEARDED MOUNTAINEER LODGE — SERVIDOR UNIFICADO ACTIVO`);
  console.log(`================================================================`);
  console.log(`📡 Puerto:    ${PORT}`);
  console.log(`🌐 Frontend:  https://beardedmountaineerlodge.com`);
  console.log(`⚙️  Admin:     https://admin.beardedmountaineerlodge.com`);
  console.log(`🔌 REST API:  https://api.beardedmountaineerlodge.com\n`);
});
