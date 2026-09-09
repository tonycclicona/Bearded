// ==============================================================================
// server.js — Bearded Mountaineer Lodge Single Web App Engine
// Homologado 100% con la arquitectura probada de Unu-Raymi
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
app.disable('x-powered-by');

// Cargar variables de entorno
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

// Directorios de compilación
const frontendDir = fs.existsSync(path.resolve(__dirname, 'frontend/out'))
  ? path.resolve(__dirname, 'frontend/out')
  : path.resolve(__dirname, 'out');

const adminDir = path.resolve(__dirname, 'admin/out');

console.log('> [Server] Frontend dir:', frontendDir);
console.log('> [Server] Admin dir:', adminDir);

// ── Sincronizar frontend/out a public_html en tiempo de ejecución ────────────
try {
  const pubTargets = [
    path.resolve(__dirname, 'public_html'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html'
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
process.env.UNIFIED_SERVER = 'true';
const { pathToFileURL } = require('url');
let backendApp = null;
const candidateBackendPaths = [
  path.resolve(__dirname, 'backend/src/server.js'),
  path.resolve(__dirname, 'backend/dist/server.js'),
  path.resolve(__dirname, 'backend/dist/index.js'),
  path.resolve(__dirname, 'backend/src/index.ts'),
  '/home/u251936581/domains/beardedmountaineerlodge.com/backend/dist/index.js'
];
const resolvedBackendPath = candidateBackendPaths.find(function(p) { return fs.existsSync(p); });

if (resolvedBackendPath) {
  import(pathToFileURL(resolvedBackendPath).href)
    .then(function(m) {
      backendApp = m.default || m.app || m;
      console.log('> [Server] Backend API montado exitosamente desde:', resolvedBackendPath);
    })
    .catch(function(err) {
      console.error('> [Server] Error backend API:', err.message);
    });
} else {
  console.error('> [Server] No se encontró punto de entrada de backend');
}

// ── 2. RUTEO DE API Y CABECERAS CORS ─────────────────────────────────────────
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('api.') || req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
    if (typeof backendApp === 'function') {
      // Si la petición viene a api.beardedmountaineerlodge.com/rooms (sin prefijo /api y no es uploads), prefijarla para que Express la reconozca
      if (host.startsWith('api.') && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
        req.url = '/api' + req.url;
      }
      return backendApp(req, res, next);
    }
    return res.status(200).json({ success: true, status: 'starting', service: 'Bearded API' });
  }
  next();
});

// ── 3. RUTEO DE ADMIN ────────────────────────────────────────────────────────
app.use(function(req, res, next) {
  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('admin.') || req.url.startsWith('/admin')) {
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
  }
  next();
});

// ── 4. RUTEO DE FRONTEND (DEFAULT) ───────────────────────────────────────────
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

// En entornos Hostinger LiteSpeed / Node.js
const port = process.env.PORT || 4000;
const server = app.listen(port, function() {
  console.log('> [Server] Bearded Mountaineer Lodge corriendo en puerto:', port);
});

server.on('error', function(err) {
  if (err.code !== 'EADDRINUSE') {
    console.error('> [Server Error]:', err.message);
  }
});

module.exports = app;
