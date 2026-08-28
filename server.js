/**
 * Gateway Monorrepo - Reverse Proxy Express con Soporte Multidominio & Subdominios
 * Dominios configurados:
 * - Frontend:   beardedmountaineer.com / www.beardedmountaineer.com
 * - Admin:      admin.beardedmountaineer.com
 * - Backend:    api.beardedmountaineer.com
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Configuración de puertos internos de los microservicios
const GATEWAY_PORT = process.env.GATEWAY_PORT || process.env.PORT || 8080;
const FRONTEND_TARGET = process.env.FRONTEND_TARGET || 'http://localhost:3000';
const BACKEND_TARGET = process.env.BACKEND_TARGET || 'http://localhost:3001';
const ADMIN_TARGET = process.env.ADMIN_TARGET || 'http://localhost:3002';

console.log('🚀 Inicializando Gateway Monorrepo...');
console.log(`   - Gateway Port: ${GATEWAY_PORT}`);
console.log(`   - Frontend Target (beardedmountaineer.com):       ${FRONTEND_TARGET}`);
console.log(`   - Admin Target    (admin.beardedmountaineer.com): ${ADMIN_TARGET}`);
console.log(`   - Backend Target  (api.beardedmountaineer.com):   ${BACKEND_TARGET}`);

// 1. Health check del Gateway
app.get('/gateway-health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    domains: {
      frontend: 'https://beardedmountaineer.com',
      admin: 'https://admin.beardedmountaineer.com',
      api: 'https://api.beardedmountaineer.com'
    },
    targets: {
      frontend: FRONTEND_TARGET,
      admin: ADMIN_TARGET,
      backend: BACKEND_TARGET
    }
  });
});

// Proxy para Backend (port 3001)
const backendProxy = createProxyMiddleware({
  target: BACKEND_TARGET,
  changeOrigin: true,
  ws: true,
  onError: (err, _req, res) => {
    console.error('❌ Error proxying to Backend API:', err.message);
    if (!res.headersSent) {
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'El servicio API Backend no está disponible temporalmente.',
          statusCode: 503
        }
      });
    }
  }
});

// Proxy para Admin Panel (port 3002)
const adminProxy = createProxyMiddleware({
  target: ADMIN_TARGET,
  changeOrigin: true,
  ws: true,
  onError: (err, _req, res) => {
    console.error('❌ Error proxying to Admin Panel:', err.message);
    if (!res.headersSent) {
      res.status(503).send('<h3>Panel de Administración no disponible temporalmente.</h3>');
    }
  }
});

// Proxy para Frontend Next.js (port 3000)
const frontendProxy = createProxyMiddleware({
  target: FRONTEND_TARGET,
  changeOrigin: true,
  ws: true,
  onError: (err, _req, res) => {
    console.error('❌ Error proxying to Frontend:', err.message);
    if (!res.headersSent) {
      res.status(503).send('<h3>Plataforma web en mantenimiento o iniciando servicios...</h3>');
    }
  }
});

// ENRUTAMIENTO INTELIGENTE POR SUBDOMINIO O RUTA
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();

  // A. Subdominio api.beardedmountaineer.com
  if (host.startsWith('api.')) {
    return backendProxy(req, res, next);
  }

  // B. Subdominio admin.beardedmountaineer.com
  if (host.startsWith('admin.')) {
    return adminProxy(req, res, next);
  }

  // C. Rutas por prefijo (fallback para acceso por IP o localhost)
  if (req.path.startsWith('/api')) {
    return backendProxy(req, res, next);
  }
  if (req.path.startsWith('/admin')) {
    return adminProxy(req, res, next);
  }

  // D. Dominio principal beardedmountaineer.com / www.beardedmountaineer.com o raíz
  return frontendProxy(req, res, next);
});

app.listen(GATEWAY_PORT, () => {
  console.log(`✅ Gateway Monorrepo activo en http://localhost:${GATEWAY_PORT}`);
  console.log(`   👉 Frontend: https://beardedmountaineer.com`);
  console.log(`   👉 Admin:    https://admin.beardedmountaineer.com`);
  console.log(`   👉 API:      https://api.beardedmountaineer.com`);
});
