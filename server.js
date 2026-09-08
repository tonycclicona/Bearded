// ==============================================================================
// server.js — Bearded Mountaineer Lodge Single Web App Engine
// Replicación exacta de la arquitectura probada de Unu-Raymi
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

// ── Directorios de compilación (Patrón Unu-Raymi) ──────────────────────────────
const frontendDir = fs.existsSync(path.resolve(__dirname, 'frontend/out'))
  ? path.resolve(__dirname, 'frontend/out')
  : path.resolve(__dirname, 'out');

const adminDir = path.resolve(__dirname, 'admin/out');
const uploadsDir = path.resolve(__dirname, 'admin/uploads');
const adminPublicDir = path.resolve(__dirname, 'admin/public');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('> [Server] Frontend dir:', frontendDir);
console.log('> [Server] Admin dir:', adminDir);

// ── Sincronizar frontend/out a public_html en tiempo de ejecución ────────────
try {
  const pubTargets = [
    path.resolve(__dirname, 'public_html'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html',
    '/home/u251936581/public_html'
  ];
  pubTargets.forEach(function(target) {
    if (fs.existsSync(target) && fs.existsSync(frontendDir) && target !== frontendDir) {
      fs.cpSync(frontendDir, target, { recursive: true });
      console.log('> [Server] Synchronized frontend files to:', target);
    }
  });
} catch (e) {
  console.error('> [Server] Warning syncing to public_html:', e.message);
}

// ── 1. CARGAR BACKEND API (ASÍNCRONO CON PATH TO FILE URL) ────────────────────
let backendApp = null;
const resolvedBackendPath = [
  path.resolve(__dirname, 'backend/dist/index.js'),
  path.resolve(__dirname, 'backend/src/index.ts'),
  path.resolve(__dirname, 'backend/dist/server.js'),
  path.resolve(__dirname, 'backend/src/server.js')
].find(function(p) { return fs.existsSync(p); });

if (resolvedBackendPath) {
  import(pathToFileURL(resolvedBackendPath).href)
    .then(function(m) {
      backendApp = m.default || m.app || m;
      console.log('> [Server] Backend API montado exitosamente desde:', resolvedBackendPath);
    })
    .catch(function(err) {
      console.error('> [Server] Error backend API:', err.message);
    });
}

// ── 2. CARGAR ADMIN PANEL (ASÍNCRONO CON PATH TO FILE URL) ────────────────────
let adminApp = null;
const resolvedAdminPath = [
  path.resolve(__dirname, 'admin/dist/index.js'),
  path.resolve(__dirname, 'admin/src/index.ts'),
  path.resolve(__dirname, 'admin/dist/server.js'),
  path.resolve(__dirname, 'admin/src/server.js')
].find(function(p) { return fs.existsSync(p); });

if (resolvedAdminPath) {
  import(pathToFileURL(resolvedAdminPath).href)
    .then(function(m) {
      adminApp = m.default || m.app || m;
      console.log('> [Server] Admin Panel montado exitosamente desde:', resolvedAdminPath);
    })
    .catch(function(err) {
      console.error('> [Server] Error admin:', err.message);
    });
}

// ── Servir archivos estáticos de Admin y Uploads ──────────────────────────────
app.use('/uploads', express.static(uploadsDir));
app.use('/admin/uploads', express.static(uploadsDir));
app.use('/admin/static', express.static(adminPublicDir));
app.use('/static', express.static(adminPublicDir));

// ── 3. RUTEO DE API Y CABECERAS CORS (Patrón Unu-Raymi) ──────────────────────
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('api.') || req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
    if (typeof backendApp === 'function') {
      // Si la petición viene a api.beardedmountaineerlodge.com/auth/login (sin prefijo /api y no es uploads), prefijarla para que Express la reconozca
      if (host.startsWith('api.') && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }
      return backendApp(req, res, next);
    }
    return res.status(200).json({ success: true, status: 'starting', service: 'Bearded API' });
  }
  next();
});

// ── 4. RUTEO DE ADMIN (Patrón Unu-Raymi) ───────────────────────────────────────
app.use(function(req, res, next) {
  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('admin.') || req.url.startsWith('/admin')) {
    if (typeof adminApp === 'function') {
      if (host.startsWith('admin.') && !req.url.startsWith('/admin')) {
        req.url = '/admin' + (req.url.startsWith('/') ? req.url : '/' + req.url);
        req.url = req.url.replace('/admin//', '/admin/');
      }
      return adminApp(req, res, next);
    }
    if (fs.existsSync(adminDir)) {
      return express.static(adminDir, { extensions: ['html'] })(req, res, function() {
        const parsed = req.path.replace(/^\/+|\/+$/g, '').split('/');
        if (parsed.length >= 3 && parsed[2] === 'editar') {
          const editPage = path.join(adminDir, parsed[0], '1', 'editar', 'index.html');
          if (fs.existsSync(editPage)) return res.sendFile(editPage);
        }
        res.sendFile(path.join(adminDir, 'index.html'));
      });
    }
    return res.status(200).send('<!DOCTYPE html><html><head><title>Admin Panel</title></head><body>Iniciando panel de administración...</body></html>');
  }
  next();
});

// ── 5. RUTEO DE FRONTEND (DEFAULT - Patrón Unu-Raymi) ─────────────────────────
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir, { extensions: ['html'] }));
}

// Fallback SPA Frontend (Patrón Unu-Raymi)
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
    const actualPort = server.address().port;
    fs.writeFileSync(path.resolve(__dirname, '.node_port'), String(actualPort));
    const pubPort = path.resolve(__dirname, 'public_html/.node_port');
    if (fs.existsSync(path.dirname(pubPort))) {
      fs.writeFileSync(pubPort, String(actualPort));
    }
  } catch (_) {}
});

server.on('error', function(err) {
  if (err.code !== 'EADDRINUSE') {
    console.error('> [Server Error]:', err.message);
  }
});

module.exports = app;
