// ==============================================================================
// server.js — Servidor Unificado Express (Backend API + Admin Panel + Frontend)
// Basado en el motor de arranque inmediato probado en Unu-Raymi
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

// Log de diagnóstico
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

process.on('exit', (code) => {
  logDebug(`[PROCESS EXIT]: Node.js finalizando con código ${code}`);
});

process.on('SIGTERM', () => {
  logDebug('[SIGNAL RECEIVED]: SIGTERM recibido');
});

process.on('SIGINT', () => {
  logDebug('[SIGNAL RECEIVED]: SIGINT recibido');
});

process.on('warning', (warning) => {
  logDebug(`[PROCESS WARNING]: ${warning.name}: ${warning.message}`);
});

// Mantener event loop activo
setInterval(() => {
  // Heartbeat cada 30 segundos
}, 30000);

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
            if (key === 'PORT') continue;
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
loadEnv(path.resolve(__dirname, 'backend/.env.production'));
loadEnv(path.resolve(__dirname, 'backend/.env'));

// ── 1. Inicialización Asíncrona de Módulos (Sin bloquear el arranque HTTP) ──
let backendApp = null;
let adminApp = null;

const backendDistPath = path.resolve(__dirname, 'backend/dist/index.js');
const backendSrcPath = path.resolve(__dirname, 'backend/src/index.ts');
const backendPath = fs.existsSync(backendDistPath) ? backendDistPath : (fs.existsSync(backendSrcPath) ? backendSrcPath : null);

if (backendPath) {
  import(pathToFileURL(backendPath).href)
    .then((m) => {
      backendApp = m.default || m.app || m;
      logDebug('> [Server] Backend API montado exitosamente.');
    })
    .catch((err) => {
      logDebug(`> [Server Error Backend]: ${err.message}`);
    });
}

const adminDistPath = path.resolve(__dirname, 'admin/dist/index.js');
const adminSrcPath = path.resolve(__dirname, 'admin/src/index.ts');
const adminPath = fs.existsSync(adminDistPath) ? adminDistPath : (fs.existsSync(adminSrcPath) ? adminSrcPath : null);

if (adminPath) {
  import(pathToFileURL(adminPath).href)
    .then((m) => {
      adminApp = m.default || m.app || m;
      logDebug('> [Server] Admin Panel montado exitosamente.');
    })
    .catch((err) => {
      logDebug(`> [Server Error Admin]: ${err.message}`);
    });
}

// ── 2. Servir Archivos Estáticos de Admin & Uploads ───────────────────────────
const uploadsDir = path.resolve(__dirname, 'admin/uploads');
const adminPublicDir = path.resolve(__dirname, 'admin/public');
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
const frontendDir = fs.existsSync(path.resolve(__dirname, 'frontend/out'))
  ? path.resolve(__dirname, 'frontend/out')
  : (fs.existsSync(path.resolve(__dirname, 'out')) ? path.resolve(__dirname, 'out') : path.resolve(__dirname, 'public_html'));

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

// ── 6. Iniciar Servidor TCP ──────────────────────────────────────────────────
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 4000;
const server = app.listen(PORT, '0.0.0.0', () => {
  logDebug(`> [Server] Servidor Express iniciado en TCP puerto: ${PORT}`);
  try {
    logDebug(`> [Server Address]: ${JSON.stringify(server.address())}`);
  } catch (_) {}
  
  // Guardar archivo .node_port para que los proxies PHP detecten el puerto
  const portDestinations = [
    path.resolve(__dirname, '.node_port'),
    path.resolve(__dirname, 'public_html/.node_port'),
    path.resolve(__dirname, 'public_html/api/.node_port'),
    path.resolve(__dirname, 'public_html/admin/.node_port'),
    path.resolve(__dirname, '../../../public_html/.node_port'),
    path.resolve(__dirname, '../../../public_html/api/.node_port'),
    path.resolve(__dirname, '../../../public_html/admin/.node_port'),
    path.resolve(__dirname, '../../public_html/.node_port'),
    '/home/u251936581/public_html/.node_port',
    '/home/u251936581/public_html/api/.node_port',
    '/home/u251936581/public_html/admin/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/api/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/admin/.node_port',
    '/tmp/bearded_node_port'
  ];

  for (const pFile of portDestinations) {
    try {
      const dir = path.dirname(pFile);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(pFile, String(PORT), 'utf8');
      }
    } catch (_) {}
  }
});

server.on('error', (err) => {
  logDebug(`> [Server Error ${err.code}]: ${err.message}`);
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = Number(PORT) === 4000 ? 3001 : 4001;
    logDebug(`> [Server] Puerto ${PORT} en uso. Intentando en puerto alternativo ${fallbackPort}...`);
    try {
      const altServer = app.listen(fallbackPort, '0.0.0.0', () => {
        logDebug(`> [Server] Servidor Express iniciado en puerto alternativo: ${fallbackPort}`);
      });
      altServer.on('error', (altErr) => {
        logDebug(`> [Server Alt Error ${altErr.code}]: ${altErr.message}`);
      });
    } catch (e) {
      logDebug(`> [Server Fallback Error]: ${e.message}`);
    }
  }
});

// ── 7. Canal Socket UNIX (Conexión directa inmune a bloqueos TCP de CloudLinux) ──
if (process.platform !== 'win32') {
  const unixSocketPaths = [
  '/tmp/bearded_gateway.sock',
  path.resolve(__dirname, 'gateway.sock'),
  path.resolve(__dirname, 'public_html/gateway.sock'),
  path.resolve(__dirname, 'public_html/api/gateway.sock'),
  path.resolve(__dirname, 'public_html/admin/gateway.sock'),
  '/home/u251936581/public_html/gateway.sock',
  '/home/u251936581/public_html/api/gateway.sock',
  '/home/u251936581/public_html/admin/gateway.sock',
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/gateway.sock',
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/api/gateway.sock',
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/admin/gateway.sock'
];

for (const sockPath of unixSocketPaths) {
  try {
    const sockDir = path.dirname(sockPath);
    if (fs.existsSync(sockDir)) {
      if (fs.existsSync(sockPath)) {
        try { fs.unlinkSync(sockPath); } catch (_) {}
      }
      const sockServer = app.listen(sockPath, () => {
        try { fs.chmodSync(sockPath, 0o777); } catch (_) {}
        logDebug(`> [Server] Canal Socket UNIX listo en: ${sockPath}`);
      });
      sockServer.on('error', (e) => {
        logDebug(`> [UNIX Sock Error ${sockPath}]: ${e.message}`);
      });
    }
  } catch (_) {}
}
}

export default app;
