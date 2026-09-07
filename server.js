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
app.set('trust proxy', true);

// Flag para evitar que los submódulos inicien listeners duplicados de puerto
process.env.UNIFIED_SERVER = 'true';

// Log de diagnóstico persistente para Hostinger
function logDebug(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(path.resolve(__dirname, 'public_html/node_debug.log'), line);
    fs.appendFileSync('/tmp/bearded_node_debug.log', line);
  } catch (_) {}
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

// ── Sincronizar frontend/out y public_html a la raíz del hosting en tiempo de ejecución ──
try {
  const localPublic = path.resolve(__dirname, 'public_html');
  const frontendOut = path.resolve(__dirname, 'apps/frontend/out');
  const adminUploads = path.resolve(__dirname, 'apps/admin/uploads');
  const pubTargets = [
    '/home/u251936581/public_html',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html',
    process.env.HOME ? path.resolve(process.env.HOME, 'public_html') : null
  ];

  // Buscar carpetas public_html superiores (ej: si el proyecto corre en ~/hbuilds)
  let parentCheck = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(parentCheck, 'public_html');
    if (candidate !== localPublic) {
      pubTargets.push(candidate);
    }
    const nextParent = path.dirname(parentCheck);
    if (nextParent === parentCheck) break;
    parentCheck = nextParent;
  }

  const validTargets = Array.from(new Set(pubTargets.filter(Boolean)));

  validTargets.forEach(target => {
    // NUNCA sobreescribir subdominios dedicados de api o admin con los archivos del frontend
    if (target.includes('api.') || target.includes('admin.')) return;

    if (fs.existsSync(target) && path.resolve(target) !== localPublic) {
      if (fs.existsSync(localPublic)) {
        fs.cpSync(localPublic, target, { recursive: true });
      }
      if (fs.existsSync(frontendOut)) {
        fs.cpSync(frontendOut, target, { recursive: true });
      }
      if (fs.existsSync(adminUploads)) {
        const upDest = path.join(target, 'uploads');
        fs.mkdirSync(upDest, { recursive: true });
        fs.cpSync(adminUploads, upDest, { recursive: true });
      }
      logDebug(`> [Server] Sincronización exitosa hacia webroot: ${target}`);
    }
  });
} catch (e) {
  logDebug(`> [Server] Advertencia sincronizando webroot: ${e.message}`);
}

// ── 1. Cargar Aplicaciones Modulares ──────────────────────────────────────────
let backendApp = null;
let adminApp = null;

try {
  const backendDistPath = path.resolve(__dirname, 'apps/backend/dist/index.js');
  const backendSrcPath = path.resolve(__dirname, 'apps/backend/src/index.ts');
  let backendPath = null;
  if (fs.existsSync(backendDistPath)) {
    backendPath = backendDistPath;
    console.log('> [Gateway] Cargando Backend desde dist...');
  } else if (fs.existsSync(backendSrcPath)) {
    backendPath = backendSrcPath;
    console.log('> [Gateway] dist/ no encontrado, cargando Backend desde src/ (tsx)...');
  }
  if (backendPath) {
    const backendModule = await import(pathToFileURL(backendPath).href);
    backendApp = backendModule.default || backendModule.app || backendModule;
    console.log('> [Gateway] Backend API inicializado correctamente.');
  } else {
    console.error('> [Gateway] No se encontró apps/backend/dist/index.js ni apps/backend/src/index.ts');
  }
} catch (err) {
  console.error('> [Gateway] Error al cargar Backend API:', err.message);
  console.error(err.stack);
}

try {
  const adminDistPath = path.resolve(__dirname, 'apps/admin/dist/index.js');
  const adminSrcPath = path.resolve(__dirname, 'apps/admin/src/index.ts');
  let adminPath = null;
  if (fs.existsSync(adminDistPath)) {
    adminPath = adminDistPath;
    console.log('> [Gateway] Cargando Admin desde dist...');
  } else if (fs.existsSync(adminSrcPath)) {
    adminPath = adminSrcPath;
    console.log('> [Gateway] dist/ no encontrado, cargando Admin desde src/ (tsx)...');
  }
  if (adminPath) {
    const adminModule = await import(pathToFileURL(adminPath).href);
    adminApp = adminModule.default || adminModule.app || adminModule;
    console.log('> [Gateway] Admin Panel inicializado correctamente.');
  } else {
    console.error('> [Gateway] No se encontró apps/admin/dist/index.js ni apps/admin/src/index.ts');
  }
} catch (err) {
  console.error('> [Gateway] Error al cargar Admin Panel:', err.message);
  console.error(err.stack);
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
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
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
      // Cuando se accede via subdominio admin., reescribir URL para que coincida con rutas /admin/...
      if (isAdminSubdomain && !req.url.startsWith('/admin')) {
        req.url = '/admin' + (req.url.startsWith('/') ? req.url : '/' + req.url);
        // Evitar double slash: /admin// -> /admin/
        req.url = req.url.replace('/admin//', '/admin/');
      }
      return adminApp(req, res, next);
    }
    return res.status(503).json({
      error: 'Admin Panel no está listo. Verifique que Node.js esté corriendo en Hostinger.',
      hint: 'Reinicie la aplicación Node.js desde el panel de Hostinger.'
    });
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
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 4000;
const server = app.listen(PORT, '0.0.0.0', () => {
  logDebug(`> [Gateway] Servidor Express unificado escuchando en puerto principal: ${PORT}`);
  
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
});

server.on('error', (err) => {
  logDebug(`> [Gateway Server Error]: ${err.message}`);
});

// Escuchar también en los puertos convencionales (4000, 3001, 3002, 3000, 8080) por si los proxies apuntan allí
const backupPorts = [4000, 3001, 3002, 3000, 8080];
for (const bPort of backupPorts) {
  if (Number(bPort) !== Number(PORT)) {
    try {
      const bServer = app.listen(bPort, '127.0.0.1', () => {
        logDebug(`> [Gateway] Respaldo activo en puerto local: ${bPort}`);
      });
      bServer.on('error', (err) => {
        logDebug(`> [Gateway Backup Port ${bPort} Error]: ${err.message}`);
      });
    } catch (e) {
      logDebug(`> [Gateway Backup Port ${bPort} Exception]: ${e.message}`);
    }
  }
}

export default app;
