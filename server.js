/**
 * Gateway Monorrepo & Master Process Runner — BEARDED MOUNTAINEER LODGE
 * Diseñado específicamente para Hostinger (Despliegue en 1 sola carpeta / WebApp)
 *
 * Dominios gestionados:
 * - Frontend:   https://beardedmountaineerlodge.com
 * - Admin:      https://admin.beardedmountaineerlodge.com
 * - Backend:    https://api.beardedmountaineerlodge.com
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn, fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de puertos
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || process.env.PORT || '8080', 10);
const FRONTEND_PORT = parseInt(process.env.INTERNAL_FRONTEND_PORT || '3000', 10);
const BACKEND_PORT = parseInt(process.env.INTERNAL_BACKEND_PORT || '3001', 10);
const ADMIN_PORT = parseInt(process.env.INTERNAL_ADMIN_PORT || '3002', 10);

const FRONTEND_TARGET = process.env.FRONTEND_TARGET || `http://127.0.0.1:${FRONTEND_PORT}`;
const BACKEND_TARGET = process.env.BACKEND_TARGET || `http://127.0.0.1:${BACKEND_PORT}`;
const ADMIN_TARGET = process.env.ADMIN_TARGET || `http://127.0.0.1:${ADMIN_PORT}`;

const AUTO_START_SERVICES = process.env.AUTO_START_SERVICES !== 'false';
const runningProcesses = [];

console.log('================================================================');
console.log('🦅 INICIALIZANDO GATEWAY MASTER — BEARDED MOUNTAINEER LODGE');
console.log('================================================================');
console.log(`📡 Puerto Público Principal (Hostinger): ${GATEWAY_PORT}`);
console.log(`🌐 Dominio Frontend: https://beardedmountaineerlodge.com -> ${FRONTEND_TARGET}`);
console.log(`⚙️  Dominio Admin:    https://admin.beardedmountaineerlodge.com -> ${ADMIN_TARGET}`);
console.log(`🔌 Dominio API:      https://api.beardedmountaineerlodge.com -> ${BACKEND_TARGET}`);
console.log('================================================================');

// 1. Iniciar automáticamente los microservicios si se ejecuta en modo autónomo (Hostinger WebApp)
if (AUTO_START_SERVICES) {
  // A. Backend API
  const backendPath = path.join(__dirname, 'apps/backend/dist/index.js');
  if (fs.existsSync(backendPath)) {
    console.log('🟢 [Gateway] Iniciando proceso Backend API...');
    const backendProc = fork(backendPath, [], {
      env: { ...process.env, PORT: String(BACKEND_PORT), NODE_ENV: process.env.NODE_ENV || 'production' },
      stdio: 'inherit'
    });
    runningProcesses.push(backendProc);
  } else {
    console.warn('⚠️ [Gateway] apps/backend/dist/index.js no encontrado. ¿Se ejecutó npm run build?');
  }

  // B. Admin Panel
  const adminPath = path.join(__dirname, 'apps/admin/dist/index.js');
  if (fs.existsSync(adminPath)) {
    console.log('🟢 [Gateway] Iniciando proceso Admin Panel...');
    const adminProc = fork(adminPath, [], {
      env: { ...process.env, ADMIN_PORT: String(ADMIN_PORT), NODE_ENV: process.env.NODE_ENV || 'production' },
      stdio: 'inherit'
    });
    runningProcesses.push(adminProc);
  } else {
    console.warn('⚠️ [Gateway] apps/admin/dist/index.js no encontrado. ¿Se ejecutó npm run build?');
  }

  // C. Frontend Next.js
  const frontendDir = path.join(__dirname, 'apps/frontend');
  const nextBin = path.join(__dirname, 'node_modules/next/dist/bin/next');
  if (fs.existsSync(frontendDir)) {
    console.log('🟢 [Gateway] Iniciando proceso Frontend Next.js...');
    const frontendProc = fork(nextBin, ['start', frontendDir, '-p', String(FRONTEND_PORT)], {
      env: { ...process.env, PORT: String(FRONTEND_PORT), NODE_ENV: process.env.NODE_ENV || 'production' },
      stdio: 'inherit'
    });
    runningProcesses.push(frontendProc);
  }
}

// 2. Archivos estáticos y subidas directas desde el Gateway
const uploadsDir = path.join(__dirname, 'apps/admin/uploads');
const adminPublicDir = path.join(__dirname, 'apps/admin/public');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/admin/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));
app.use('/admin/static', express.static(adminPublicDir));
app.use('/static', express.static(adminPublicDir));

// 3. Health check del Gateway
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
    targets: {
      frontend: FRONTEND_TARGET,
      admin: ADMIN_TARGET,
      backend: BACKEND_TARGET
    }
  });
});

// 3. Proxies con reintento y fallback
const backendProxy = createProxyMiddleware({
  target: BACKEND_TARGET,
  changeOrigin: true,
  ws: true,
  onError: (err, _req, res) => {
    console.error('❌ [Gateway] Error comunicando con Backend API:', err.message);
    if (!res.headersSent) {
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'El servicio API Backend está iniciando o no disponible.',
          statusCode: 503
        }
      });
    }
  }
});

const adminProxy = createProxyMiddleware({
  target: ADMIN_TARGET,
  changeOrigin: true,
  ws: true,
  onError: (err, _req, res) => {
    console.error('❌ [Gateway] Error comunicando con Admin Panel:', err.message);
    if (!res.headersSent) {
      res.status(503).send('<h3>Panel de Administración iniciando... Recargue en unos segundos.</h3>');
    }
  }
});

const frontendProxy = createProxyMiddleware({
  target: FRONTEND_TARGET,
  changeOrigin: true,
  ws: true,
  onError: (err, _req, res) => {
    console.error('❌ [Gateway] Error comunicando con Frontend:', err.message);
    if (!res.headersSent) {
      res.status(503).send('<h3>Plataforma web iniciando... Recargue en unos segundos.</h3>');
    }
  }
});

// 4. Enrutador Inteligente Multidominio & Subdominios
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();

  // A. Subdominio api.beardedmountaineerlodge.com
  if (host.startsWith('api.')) {
    return backendProxy(req, res, next);
  }

  // B. Subdominio admin.beardedmountaineerlodge.com
  if (host.startsWith('admin.')) {
    return adminProxy(req, res, next);
  }

  // C. Fallback por prefijo de ruta (acceso por IP o localhost)
  if (req.path.startsWith('/api')) {
    return backendProxy(req, res, next);
  }
  if (req.path.startsWith('/admin')) {
    return adminProxy(req, res, next);
  }

  // D. Dominio principal beardedmountaineerlodge.com / www o cualquier otra ruta
  return frontendProxy(req, res, next);
});

// 5. Iniciar Servidor Gateway
const server = app.listen(GATEWAY_PORT, () => {
  console.log(`\n✅ SERVIDOR UNIFICADO ACTIVO EN PUERTO: ${GATEWAY_PORT}`);
  console.log(`   👉 Frontend Web:   https://beardedmountaineerlodge.com`);
  console.log(`   👉 Admin Panel:    https://admin.beardedmountaineerlodge.com`);
  console.log(`   👉 REST API:       https://api.beardedmountaineerlodge.com\n`);
});

// 6. Cierre Limpio (Graceful Shutdown)
function shutdown() {
  console.log('\n🛑 Cerrando Gateway y microservicios internos...');
  runningProcesses.forEach(proc => {
    try {
      proc.kill('SIGTERM');
    } catch (_) {}
  });
  server.close(() => {
    console.log('✅ Gateway cerrado correctamente.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
