// ==============================================================================
// server.js — Bearded Mountaineer Lodge Single Web App Engine
// Arquitectura Unificada para Hostinger (Frontend SSG + REST API + Admin Panel)
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const { pathToFileURL } = require('url');

const app = express();
app.disable('x-powered-by');

// Señal para que backend y admin no abran listeners de puerto duplicados
process.env.UNIFIED_SERVER = 'true';

// ── 1. Cargar Variables de Entorno ──────────────────────────────────────────
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
            if (k === 'PORT') return;
            if (!process.env[k]) process.env[k] = v;
          }
        }
      });
    } catch (_) {}
  }
}

loadEnv(path.resolve(__dirname, '.env.production'));
loadEnv(path.resolve(__dirname, '.env'));
loadEnv(path.resolve(__dirname, 'apps/backend/.env.production'));
loadEnv(path.resolve(__dirname, 'apps/backend/.env'));

// ── 2. Directorios Base ─────────────────────────────────────────────────────
const publicHtmlDir = path.resolve(__dirname, 'public_html');
const frontendOutDir = path.resolve(__dirname, 'apps/frontend/out');
const staticDir = fs.existsSync(publicHtmlDir) ? publicHtmlDir : frontendOutDir;

const uploadsDir = path.resolve(__dirname, 'apps/admin/uploads');
const adminPublicDir = path.resolve(__dirname, 'apps/admin/public');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── 3. Cargar Backend REST API y Admin Panel In-Process ──────────────────────
let backendApp = null;
const resolvedBackendPath = fs.existsSync(path.resolve(__dirname, 'apps/backend/dist/index.js'))
  ? path.resolve(__dirname, 'apps/backend/dist/index.js')
  : path.resolve(__dirname, 'apps/backend/src/index.js');

import(pathToFileURL(resolvedBackendPath).href)
  .then(function(m) {
    backendApp = m.default || m.app || m;
    console.log('> [Server] Backend API montado exitosamente');
  })
  .catch(function(err) {
    console.error('> [Server] Error backend API:', err.message);
  });

let adminApp = null;
const resolvedAdminPath = path.resolve(__dirname, 'apps/admin/dist/index.js');
if (fs.existsSync(resolvedAdminPath)) {
  import(pathToFileURL(resolvedAdminPath).href)
    .then(function(m) {
      adminApp = m.default || m.app || m;
      console.log('> [Server] Admin Panel montado exitosamente');
    })
    .catch(function(err) {
      console.error('> [Server] Error admin panel:', err.message);
    });
}

// ── 4. Estáticos de Medios y Admin ──────────────────────────────────────────
app.use('/admin/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));
app.use('/admin/static', express.static(adminPublicDir));
app.use('/static', express.static(adminPublicDir));

// ── 5. CORS Global y Ruteo de API ───────────────────────────────────────────
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('api.') || req.url.startsWith('/api')) {
    if (typeof backendApp === 'function') {
      if (host.startsWith('api.') && !req.url.startsWith('/api')) {
        req.url = '/api' + req.url;
      }
      return backendApp(req, res, next);
    }
    return res.status(200).json({ success: true, status: 'starting', service: 'Bearded API' });
  }
  next();
});

// ── 6. Ruteo de Subdominio y Rutas de Admin ─────────────────────────────────
app.use(function(req, res, next) {
  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('admin.') || req.url.startsWith('/admin')) {
    if (typeof adminApp === 'function') {
      if (host.startsWith('admin.') && !req.url.startsWith('/admin')) {
        req.url = '/admin' + req.url;
      }
      return adminApp(req, res, next);
    }
    return res.status(200).send('Admin starting...');
  }
  next();
});

// ── 7. Servidor Estático de Frontend SSG (Dominio Principal) ────────────────
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir, { extensions: ['html'] }));
}

// Fallback para SPA / Rutas dinámicas
app.use(function(req, res) {
  const candidates = [
    path.join(staticDir, 'index.html'),
    path.resolve(__dirname, 'public_html/index.html'),
    path.resolve(__dirname, 'apps/frontend/out/index.html')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return res.sendFile(c);
    }
  }
  res.status(200).send('<!DOCTYPE html><html><head><title>Bearded Mountaineer Lodge</title></head><body>Bearded Mountaineer Lodge</body></html>');
});

// ── 8. Inicio del Servidor con Puertos Predeterminados y Dinámicos ──────────
const mainPort = process.env.PORT || process.env.GATEWAY_PORT || 8080;

// Puerto principal asignado por Hostinger o 8080
const mainServer = app.listen(mainPort, '0.0.0.0', function() {
  console.log('> [Server] Bearded Mountaineer Lodge activo en puerto principal:', mainPort);
  try {
    const portFile = path.resolve(__dirname, 'public_html/.node_port');
    fs.mkdirSync(path.dirname(portFile), { recursive: true });
    fs.writeFileSync(portFile, String(mainPort), 'utf8');
  } catch (_) {}
});

mainServer.on('error', function(err) {
  if (err.code !== 'EADDRINUSE') {
    console.error('> [Server Error]:', err.message);
  }
});

// Puertos predeterminados adicionales para comunicación directa e interconexión
const backupPorts = [3001, 3002, 4000, 3000];
backupPorts.forEach(function(p) {
  if (Number(mainPort) !== p) {
    try {
      const s = app.listen(p, '0.0.0.0', function() {
        console.log(`> [Server] Canal predeterminado abierto en puerto: ${p}`);
      });
      s.on('error', function() {}); // Silenciar si el puerto ya está en uso
    } catch (_) {}
  }
});

module.exports = app;
