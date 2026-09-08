// ==============================================================================
// server.js — Bearded Mountaineer Lodge Unified Node.js Gateway
// Orquestador principal: sirve API (/api/*), Admin (/admin/*) y Frontend (static)
// Puerto: process.env.GATEWAY_PORT || 4000
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const { pathToFileURL } = require('url');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// Prevenir que sub-apps llamen a app.listen por su cuenta
process.env.UNIFIED_SERVER = 'true';

// ── Cargar variables de entorno (Patrón Unu-Raymi) ─────────────────────────────
function loadEnv(file) {
  if (fs.existsSync(file)) {
    try {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach(function(l) {
        const t = l.trim();
        if (t && !t.startsWith('#')) {
          const eq = t.indexOf('=');
          if (eq !== -1) {
            const k = t.substring(0, eq).trim();
            let v = t.substring(eq + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.substring(1, v.length - 1);
            }
            if (k === 'PORT' && process.env.PORT) return;
            if (!process.env[k]) process.env[k] = v;
          }
        }
      });
    } catch (e) {}
  }
}

loadEnv(path.resolve(__dirname, '.env.production'));
loadEnv(path.resolve(__dirname, '.env'));
loadEnv(path.resolve(__dirname, 'backend/.env.production'));
loadEnv(path.resolve(__dirname, 'backend/.env'));

// ── Directorios de contenido ────────────────────────────────────────────────
const frontendDir = fs.existsSync(path.resolve(__dirname, 'frontend/out'))
  ? path.resolve(__dirname, 'frontend/out')
  : path.resolve(__dirname, 'out');

const uploadsDir = path.resolve(__dirname, 'admin/uploads');
const adminPublicDir = path.resolve(__dirname, 'admin/public');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('> [Server] Frontend dir:', frontendDir);
console.log('> [Server] Uploads dir:', uploadsDir);

// ── 1. CARGAR BACKEND API (ASÍNCRONO CON PATH TO FILE URL) ────────────────────
let backendApp = null;
let backendError = null;
const candidateBackendPaths = [
  path.resolve(__dirname, 'backend/dist/index.js'),
  path.resolve(__dirname, '../backend/dist/index.js'),
  '/home/u251936581/domains/beardedmountaineerlodge.com/backend/dist/index.js',
  path.resolve(__dirname, 'backend/dist/server.js'),
  path.resolve(__dirname, '../backend/dist/server.js'),
  path.resolve(__dirname, 'backend/src/index.ts'),
  path.resolve(__dirname, '../backend/src/index.ts'),
  path.resolve(__dirname, 'backend/src/server.js'),
  path.resolve(__dirname, '../backend/src/server.js')
];
const resolvedBackendPath = candidateBackendPaths.find(function(p) { return fs.existsSync(p); });

const backendPromise = resolvedBackendPath
  ? import(pathToFileURL(resolvedBackendPath).href)
      .then(function(m) {
        backendApp = m.default || m.app || m;
        console.log('> [Server] Backend API montado exitosamente desde:', resolvedBackendPath);
      })
      .catch(function(err) {
        backendError = err;
        console.error('> [Server] Error cargando backend API:', err);
      })
  : Promise.resolve().then(function() {
      backendError = new Error('No se encontró backend/dist/index.js');
    });

// ── 2. CARGAR ADMIN PANEL (ASÍNCRONO CON PATH TO FILE URL) ────────────────────
let adminApp = null;
let adminError = null;
const candidateAdminPaths = [
  path.resolve(__dirname, 'admin/dist/index.js'),
  path.resolve(__dirname, '../admin/dist/index.js'),
  '/home/u251936581/domains/beardedmountaineerlodge.com/admin/dist/index.js',
  path.resolve(__dirname, 'admin/dist/server.js'),
  path.resolve(__dirname, '../admin/dist/server.js'),
  path.resolve(__dirname, 'admin/src/index.ts'),
  path.resolve(__dirname, '../admin/src/index.ts'),
  path.resolve(__dirname, 'admin/src/server.js'),
  path.resolve(__dirname, '../admin/src/server.js')
];
const resolvedAdminPath = candidateAdminPaths.find(function(p) { return fs.existsSync(p); });

const adminPromise = resolvedAdminPath
  ? import(pathToFileURL(resolvedAdminPath).href)
      .then(function(m) {
        adminApp = m.default || m.app || m;
        console.log('> [Server] Admin Panel montado exitosamente desde:', resolvedAdminPath);
      })
      .catch(function(err) {
        adminError = err;
        console.error('> [Server] Error cargando admin:', err);
      })
  : Promise.resolve().then(function() {
      adminError = new Error('No se encontró admin/dist/index.js');
    });

// ── Servir archivos estáticos de Admin y Uploads ──────────────────────────────
app.use('/uploads', express.static(uploadsDir));
app.use('/admin/uploads', express.static(uploadsDir));
app.use('/admin/static', express.static(adminPublicDir));
app.use('/static', express.static(adminPublicDir));

// ── 3. CORS + RUTEO DE API ────────────────────────────────────────────────────
const CORS_ALLOWED = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(function(o) { return o.trim(); })
  : [
      'https://beardedmountaineerlodge.com',
      'https://www.beardedmountaineerlodge.com',
      'https://admin.beardedmountaineerlodge.com',
      'https://api.beardedmountaineerlodge.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ];

app.use(function(req, res, next) {
  const origin = req.headers.origin || '';
  const allowed =
    CORS_ALLOWED.includes(origin) ||
    origin.includes('beardedmountaineerlodge.com') ||
    origin.includes('localhost');

  if (allowed && origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('api.') || req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
    const handleApi = function() {
      if (typeof backendApp === 'function') {
        if (host.startsWith('api.') && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
          req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
        }
        return backendApp(req, res, next);
      }
      if (backendError) {
        return res.status(500).json({
          success: false,
          error: 'Backend API Error: ' + backendError.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : backendError.stack
        });
      }
      return res.status(200).json({ success: true, status: 'starting', service: 'Bearded API' });
    };

    if (backendApp) {
      return handleApi();
    }
    return backendPromise.then(handleApi).catch(next);
  }
  next();
});

// ── 4. RUTEO DE ADMIN (Patrón Unu-Raymi) ───────────────────────────────────────
app.use(function(req, res, next) {
  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('admin.') || req.url.startsWith('/admin')) {
    const handleAdmin = function() {
      if (typeof adminApp === 'function') {
        if (host.startsWith('admin.') && !req.url.startsWith('/admin')) {
          req.url = '/admin' + (req.url.startsWith('/') ? req.url : '/' + req.url);
          req.url = req.url.replace('/admin//', '/admin/');
        }
        return adminApp(req, res, next);
      }
      if (adminError) {
        return res.status(500).send('<!DOCTYPE html><html><head><title>Admin Error</title></head><body><h1>Error cargando Admin Panel</h1><pre>' + adminError.message + '</pre></body></html>');
      }
      return res.status(200).send('<!DOCTYPE html><html><head><title>Admin Panel</title></head><body>Iniciando panel de administración...</body></html>');
    };

    if (adminApp) {
      return handleAdmin();
    }
    return adminPromise.then(handleAdmin).catch(next);
  }
  next();
});

// ── 5. RUTEO DE FRONTEND (DEFAULT) ───────────────────────────────────────────
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir, { extensions: ['html'] }));
}

// Fallback SPA Frontend
app.use(function(req, res) {
  const candidates = [
    path.join(frontendDir, 'index.html'),
    path.resolve(__dirname, 'out/index.html'),
    path.resolve(__dirname, 'public_html/index.html')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return res.sendFile(c);
    }
  }
  res.status(200).send('<!DOCTYPE html><html><head><title>Bearded Mountaineer Lodge</title></head><body>Bearded Mountaineer Lodge</body></html>');
});

// ── 6. EN ENTORNOS HOSTINGER LITESPEED / NODE.JS ─────────────────────────────
const port = process.env.PORT || process.env.GATEWAY_PORT || 4000;
const server = app.listen(port, function() {
  console.log('> [Server] Bearded Mountaineer Lodge corriendo en puerto:', port);
  try {
    const addr = server.address();
    const actualPort = (typeof addr === 'object' && addr && addr.port) ? String(addr.port) : String(port);
    if (actualPort && actualPort !== 'undefined') {
      fs.writeFileSync(path.resolve(__dirname, '.node_port'), actualPort);
    }
    if (typeof addr === 'string') {
      fs.writeFileSync(path.resolve(__dirname, '.node_socket'), addr);
    }

    // Escribir en ruta oficial de Hostinger si existe
    const hostingerPublic = '/home/u251936581/domains/beardedmountaineerlodge.com/public_html';
    if (fs.existsSync(hostingerPublic)) {
      if (actualPort && actualPort !== 'undefined') {
        fs.writeFileSync(path.join(hostingerPublic, '.node_port'), actualPort);
        const apiDir = path.join(hostingerPublic, 'api');
        const adminDir = path.join(hostingerPublic, 'admin');
        if (fs.existsSync(apiDir)) fs.writeFileSync(path.join(apiDir, '.node_port'), actualPort);
        if (fs.existsSync(adminDir)) fs.writeFileSync(path.join(adminDir, '.node_port'), actualPort);
      }
      if (typeof addr === 'string') {
        fs.writeFileSync(path.join(hostingerPublic, '.node_socket'), addr);
      }
    }
  } catch (_) {}
});

server.on('error', function(err) {
  if (err.code !== 'EADDRINUSE') {
    console.error('> [Server Error]:', err.message);
  }
});

module.exports = app;
