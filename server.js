// ==============================================================================
// server.js — Servidor Unificado Express (Backend API + Admin Panel + Frontend)
// Basado en el motor probado y funcional de Unu-Raymi para Hostinger Web Apps
// ==============================================================================

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

process.env.UNIFIED_SERVER = 'true';

// Log de diagnóstico persistente
function logDebug(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  const logTargets = [
    path.resolve(__dirname, 'node_debug.log'),
    path.resolve(__dirname, 'public_html/node_debug.log'),
    '/home/u251936581/public_html/node_debug.log',
    '/tmp/bearded_node_debug.log'
  ];
  for (const lt of logTargets) {
    try { fs.appendFileSync(lt, line); } catch (_) {}
  }
}

process.on('uncaughtException', (err) => {
  logDebug(`[FATAL UNCAUGHT EXCEPTION]: ${err.stack || err.message}`);
});

process.on('unhandledRejection', (reason) => {
  logDebug(`[UNHANDLED REJECTION]: ${reason?.stack || reason}`);
});

logDebug(`Iniciando server.js en Node ${process.version} (PID: ${process.pid}, CWD: ${process.cwd()})`);

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
            if (key === 'PORT' && process.env.PORT) continue;
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
loadEnv(path.resolve(__dirname, 'apps/backend/.env.production'));
loadEnv(path.resolve(__dirname, 'apps/backend/.env'));

// ── 1. Cargar Aplicaciones Modulares (Backend API & Admin Panel) ─────────────
let backendApp = null;
let adminApp = null;

try {
  const backendDistPath = path.resolve(__dirname, 'apps/backend/dist/index.js');
  const backendSrcPath = path.resolve(__dirname, 'apps/backend/src/index.ts');
  let backendPath = null;
  if (fs.existsSync(backendDistPath)) {
    backendPath = backendDistPath;
    console.log('> [Server] Cargando Backend desde dist...');
  } else if (fs.existsSync(backendSrcPath)) {
    backendPath = backendSrcPath;
    console.log('> [Server] Cargando Backend desde src/ (tsx)...');
  }
  if (backendPath) {
    const backendModule = await import(pathToFileURL(backendPath).href);
    backendApp = backendModule.default || backendModule.app || backendModule;
    logDebug('> [Server] Backend API inicializado correctamente.');
  }
} catch (err) {
  logDebug(`> [Server Error Backend]: ${err.message}`);
}

try {
  const adminDistPath = path.resolve(__dirname, 'apps/admin/dist/index.js');
  const adminSrcPath = path.resolve(__dirname, 'apps/admin/src/index.ts');
  let adminPath = null;
  if (fs.existsSync(adminDistPath)) {
    adminPath = adminDistPath;
    console.log('> [Server] Cargando Admin desde dist...');
  } else if (fs.existsSync(adminSrcPath)) {
    adminPath = adminSrcPath;
    console.log('> [Server] Cargando Admin desde src/ (tsx)...');
  }
  if (adminPath) {
    const adminModule = await import(pathToFileURL(adminPath).href);
    adminApp = adminModule.default || adminModule.app || adminModule;
    logDebug('> [Server] Admin Panel inicializado correctamente.');
  }
} catch (err) {
  logDebug(`> [Server Error Admin]: ${err.message}`);
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

// ── 3. Cabeceras CORS Globales y Ruteo de API (Patrón Unu-Raymi) ─────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const host = (req.headers.host || '').toLowerCase();
  const isApiSubdomain = host.startsWith('api.');
  const isApiPath = req.url.startsWith('/api');

  if (isApiSubdomain || isApiPath) {
    if (typeof backendApp === 'function') {
      if (isApiSubdomain && !req.url.startsWith('/api')) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }
      return backendApp(req, res, next);
    }
    return res.status(200).json({ success: true, status: 'starting', service: 'Bearded API' });
  }
  next();
});

// ── 4. Ruteo de Admin Panel (admin.dominio o /admin) ──────────────────────────
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  const isAdminSubdomain = host.startsWith('admin.');
  const isAdminPath = req.url.startsWith('/admin');

  if (isAdminSubdomain || isAdminPath) {
    if (typeof adminApp === 'function') {
      if (isAdminSubdomain && !req.url.startsWith('/admin')) {
        req.url = '/admin' + (req.url.startsWith('/') ? req.url : '/' + req.url);
        req.url = req.url.replace('/admin//', '/admin/');
      }
      return adminApp(req, res, next);
    }
    return res.status(200).json({ success: true, status: 'starting', service: 'Bearded Admin' });
  }
  next();
});

// ── 5. Frontend Estático (Next.js export) ─────────────────────────────────────
const frontendDir = fs.existsSync(path.resolve(__dirname, 'apps/frontend/out'))
  ? path.resolve(__dirname, 'apps/frontend/out')
  : path.resolve(__dirname, 'out');

if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir, { extensions: ['html'] }));

  // Fallback SPA
  app.use((req, res) => {
    const indexPath = path.join(frontendDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    res.status(200).send('<!DOCTYPE html><html><head><title>Bearded Mountaineer Lodge</title></head><body>Cargando...</body></html>');
  });
} else {
  app.use((_req, res) => {
    res.status(200).send('Bearded Mountaineer Lodge - Sistema iniciado.');
  });
}

// ── 6. Iniciar Servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 4000;
const server = app.listen(PORT, '0.0.0.0', () => {
  logDebug(`> [Server] Servidor Express corriendo en puerto: ${PORT}`);
  
  // Guardar archivo .node_port para que los proxies PHP detecten el puerto
  const portDestinations = [
    path.resolve(__dirname, '.node_port'),
    path.resolve(__dirname, 'public_html/.node_port'),
    path.resolve(__dirname, '../../../public_html/.node_port'),
    path.resolve(__dirname, '../../public_html/.node_port'),
    '/home/u251936581/public_html/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/.node_port',
    '/tmp/bearded_node_port'
  ];

  for (const pFile of portDestinations) {
    try {
      fs.writeFileSync(pFile, String(PORT), 'utf8');
    } catch (_) {}
  }
});

server.on('error', (err) => {
  logDebug(`> [Server Error]: ${err.message}`);
});

export default app;
