// ==============================================================================
// server.js — Bearded Mountaineer Lodge Single Web App Engine
// Arquitectura probada y optimizada basada en Unu-Raymi para Hostinger LiteSpeed
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const { pathToFileURL } = require('url');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// ── Cargar Variables de Entorno ───────────────────────────────────────────────
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

loadEnv(path.resolve(__dirname, '.env'));
loadEnv(path.resolve(__dirname, 'backend/.env'));

// ── Directorios de Compilación ────────────────────────────────────────────────
const frontendDir = fs.existsSync(path.resolve(__dirname, 'frontend/out'))
  ? path.resolve(__dirname, 'frontend/out')
  : path.resolve(__dirname, 'out');

const uploadsDir = path.resolve(__dirname, 'admin/uploads');
const adminPublicDir = path.resolve(__dirname, 'admin/public');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('> [Server] Frontend dir:', frontendDir);

// ── Sincronizar frontend a public_html en tiempo de ejecución (Patrón Unu-Raymi) ──
try {
  const pubTargets = [
    path.resolve(__dirname, 'public_html'),
    process.platform === 'linux' ? '/home/u251936581/domains/beardedmountaineerlodge.com/public_html' : null,
    process.platform === 'linux' ? '/home/u251936581/public_html' : null,
    process.env.HOME ? path.join(process.env.HOME, 'domains/beardedmountaineerlodge.com/public_html') : null,
    process.env.HOME ? path.join(process.env.HOME, 'public_html') : null
  ].filter(Boolean);

  pubTargets.forEach(function(target) {
    if (fs.existsSync(target) && fs.existsSync(frontendDir) && target !== frontendDir) {
      fs.cpSync(frontendDir, target, { recursive: true });
      console.log('> [Server] Sincronizado frontend estático hacia:', target);
    }
  });
} catch (e) {
  console.error('> [Server] Warning sincronizando a public_html:', e.message);
}

// ── 1. CARGAR BACKEND API (ASÍNCRONO CON PATH TO FILE URL) ────────────────────
let backendApp = null;
const resolvedBackendPath = fs.existsSync(path.resolve(__dirname, 'backend/dist/index.js'))
  ? path.resolve(__dirname, 'backend/dist/index.js')
  : path.resolve(__dirname, 'backend/src/index.ts');

if (fs.existsSync(resolvedBackendPath)) {
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
const resolvedAdminPath = fs.existsSync(path.resolve(__dirname, 'admin/dist/index.js'))
  ? path.resolve(__dirname, 'admin/dist/index.js')
  : path.resolve(__dirname, 'admin/src/index.ts');

if (fs.existsSync(resolvedAdminPath)) {
  import(pathToFileURL(resolvedAdminPath).href)
    .then(function(m) {
      adminApp = m.default || m.app || m;
      console.log('> [Server] Admin Panel montado exitosamente desde:', resolvedAdminPath);
    })
    .catch(function(err) {
      console.error('> [Server] Error admin:', err.message);
    });
}

// ── 3. SERVIR ARCHIVOS ESTÁTICOS DE ADMIN Y UPLOADS ───────────────────────────
app.use('/uploads', express.static(uploadsDir));
app.use('/admin/uploads', express.static(uploadsDir));
app.use('/admin/static', express.static(adminPublicDir));
app.use('/static', express.static(adminPublicDir));

// ── 4. RUTEO DE API Y CABECERAS CORS (Patrón Unu-Raymi) ──────────────────────
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
      if (host.startsWith('api.') && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }
      return backendApp(req, res, next);
    }
    return res.status(200).json({ success: true, status: 'starting', service: 'Bearded API' });
  }
  next();
});

// ── 5. RUTEO DE ADMIN (Patrón Unu-Raymi) ───────────────────────────────────────
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
    return res.status(200).send('Cargando panel de administración...');
  }
  next();
});

// ── 6. RUTEO DE FRONTEND (DEFAULT) ────────────────────────────────────────────
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

// ── 7. ARRANQUE DEL SERVIDOR TCP ──────────────────────────────────────────────
const port = process.env.PORT || 4000;
const server = app.listen(port, function() {
  console.log('> [Server] Bearded Mountaineer Lodge corriendo en puerto:', port);

  // Guardar archivo .node_port
  const portDestinations = [
    path.resolve(__dirname, '.node_port'),
    path.resolve(__dirname, 'public_html/.node_port'),
    path.resolve(__dirname, 'public_html/api/.node_port'),
    path.resolve(__dirname, 'public_html/admin/.node_port')
  ];
  portDestinations.forEach(function(pFile) {
    try {
      const dir = path.dirname(pFile);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(pFile, String(port), 'utf8');
      }
    } catch (_) {}
  });
});

server.on('error', function(err) {
  if (err.code !== 'EADDRINUSE') {
    console.error('> [Server Error]:', err.message);
  }
});

// Canal Socket UNIX opcional para Linux
if (process.platform !== 'win32') {
  const sockPath = path.resolve(__dirname, 'gateway.sock');
  try {
    if (fs.existsSync(sockPath)) {
      try { fs.unlinkSync(sockPath); } catch (_) {}
    }
    app.listen(sockPath, function() {
      try { fs.chmodSync(sockPath, 0o777); } catch (_) {}
      console.log('> [Server] Canal Socket UNIX listo en:', sockPath);
    });
  } catch (_) {}
}

module.exports = app;
