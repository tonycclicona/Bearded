// ==============================================================================
// server.js — Servidor Unificado Express (Backend API + Admin Panel + Frontend)
// Diseñado para Hostinger (Dominio principal y Subdominios) y Entorno Local
// ==============================================================================

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

// Flag para evitar que los submódulos inicien listeners duplicados de puerto
process.env.UNIFIED_SERVER = 'true';

// ── 0. Cargar Variables de Entorno ──────────────────────────────────────────
function loadEnv(file) {
  if (fs.existsSync(file)) {
    try {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eq = trimmed.indexOf('=');
          if (eq !== -1) {
            const key = trimmed.substring(0, eq).trim();
            let val = trimmed.substring(eq + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch (_) {}
  }
}

loadEnv(path.resolve(__dirname, '.env.production'));
loadEnv(path.resolve(__dirname, '.env'));

// ── 1. Cargar Aplicaciones Modulares ──────────────────────────────────────────
let backendApp = null;
let adminApp = null;

try {
  const backendPath = fs.existsSync(path.resolve(__dirname, 'apps/backend/dist/index.js'))
    ? path.resolve(__dirname, 'apps/backend/dist/index.js')
    : path.resolve(__dirname, 'apps/backend/src/index.js');
  const backendModule = await import(pathToFileURL(backendPath).href);
  backendApp = backendModule.default || backendModule.app || backendModule;
  console.log('> [Gateway] Backend API inicializado correctamente.');
} catch (err) {
  console.error('> [Gateway] Error al cargar Backend API:', err.message);
}

try {
  const adminPath = fs.existsSync(path.resolve(__dirname, 'apps/admin/dist/index.js'))
    ? path.resolve(__dirname, 'apps/admin/dist/index.js')
    : path.resolve(__dirname, 'apps/admin/src/index.js');
  const adminModule = await import(pathToFileURL(adminPath).href);
  adminApp = adminModule.default || adminModule.app || adminModule;
  console.log('> [Gateway] Admin Panel inicializado correctamente.');
} catch (err) {
  console.error('> [Gateway] Error al cargar Admin Panel:', err.message);
}

// ── 2. Servir Archivos Estáticos de Admin & Uploads ───────────────────────────
const uploadsDir = path.resolve(__dirname, 'apps/admin/uploads');
const adminPublicDir = path.resolve(__dirname, 'apps/admin/public');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));
app.use('/admin/uploads', express.static(uploadsDir));
app.use('/admin/static', express.static(adminPublicDir));
app.use('/static', express.static(adminPublicDir));

// ── 3. Enrutamiento Inteligente por Subdominio / Ruta ─────────────────────────

// 3.1 API (api.dominio.com o dominio.com/api)
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  const isApiSubdomain = host.startsWith('api.');
  const isApiPath = req.url.startsWith('/api');

  if (isApiSubdomain || isApiPath) {
    if (typeof backendApp === 'function') {
      if (isApiSubdomain && !req.url.startsWith('/api')) {
        req.url = '/api' + req.url;
      }
      return backendApp(req, res, next);
    }
    return res.status(503).json({ error: 'Backend API no está listo' });
  }
  next();
});

// 3.2 Admin (admin.dominio.com o dominio.com/admin)
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  const isAdminSubdomain = host.startsWith('admin.');
  const isAdminPath = req.url.startsWith('/admin');

  if (isAdminSubdomain || isAdminPath) {
    if (typeof adminApp === 'function') {
      if (isAdminSubdomain && !req.url.startsWith('/admin')) {
        req.url = '/admin' + req.url;
      }
      return adminApp(req, res, next);
    }
    return res.status(503).send('Admin Panel no está listo');
  }
  next();
});

// ── 4. Frontend Estático (Next.js export) ─────────────────────────────────────
const frontendOutDir = path.resolve(__dirname, 'apps/frontend/out');
if (fs.existsSync(frontendOutDir)) {
  app.use(express.static(frontendOutDir, { extensions: ['html'] }));

  // Fallback SPA
  app.use((req, res) => {
    const indexPath = path.join(frontendOutDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    res.status(404).send('Not Found');
  });
} else {
  app.use((_req, res) => {
    res.status(200).send('Antigravity Platform - Listo. Frontend pendiente de compilación (npm run build).');
  });
}

// ── 5. Iniciar Servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`> [Gateway] Servidor Express unificado escuchando en puerto principal: ${PORT}`);
  
  // Guardar puerto en todas las rutas posibles para los proxies PHP
  const portDestinations = [
    path.resolve(__dirname, '.node_port'),
    path.resolve(__dirname, 'public_html/.node_port'),
    path.resolve(__dirname, '../../../public_html/.node_port'),
    path.resolve(__dirname, '../../public_html/.node_port'),
    path.resolve(__dirname, '../public_html/.node_port'),
    '/home/u251936581/public_html/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/.node_port',
    '/tmp/bearded_node_port'
  ];

  for (const pFile of portDestinations) {
    try {
      fs.writeFileSync(pFile, String(PORT), 'utf8');
    } catch (_) {}
  }

  // Si estamos en un build de Hostinger (hbuilds/current/nodejs/...), sincronizar public_html hacia la raíz del hosting
  try {
    const srcPub = path.resolve(__dirname, 'public_html');
    const rootCandidates = [
      path.resolve(__dirname, '../../../../public_html'),
      path.resolve(__dirname, '../../../public_html'),
      path.resolve(__dirname, '../../public_html'),
      '/home/u251936581/public_html',
      '/home/u251936581/domains/beardedmountaineerlodge.com/public_html'
    ];
    if (fs.existsSync(srcPub)) {
      for (const dest of rootCandidates) {
        if (fs.existsSync(dest) && path.resolve(dest) !== path.resolve(srcPub)) {
          // Copia no bloqueante
          fs.cp(srcPub, dest, { recursive: true }, () => {});
        }
      }
    }
  } catch (_) {}
});

server.on('error', (err) => {
  console.error('> [Gateway Server Error]:', err.message);
});

// Escuchar también en los puertos convencionales (3001, 3002, 3000, 4000) por si los proxies PHP de Hostinger apuntan allí
const backupPorts = [3001, 3002, 3000, 4000];
for (const bPort of backupPorts) {
  if (Number(bPort) !== Number(PORT)) {
    try {
      const bServer = app.listen(bPort, '127.0.0.1', () => {
        console.log(`> [Gateway] Respaldo activo en puerto local: ${bPort}`);
      });
      bServer.on('error', () => {
        // Puerto ya en uso o no permitido, ignorar silenciosamente
      });
    } catch (_) {}
  }
}

export default app;
