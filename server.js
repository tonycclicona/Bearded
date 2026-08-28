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

// ── Cargar variables de entorno ───────────────────────────────────────────────
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
    } catch (e) {}
  }
}

loadEnv(path.resolve(__dirname, '.env.production'));
loadEnv(path.resolve(__dirname, '.env'));
loadEnv(path.resolve(__dirname, 'apps/backend/.env.production'));
loadEnv(path.resolve(__dirname, 'apps/backend/.env'));

// ── Directorios de compilación ────────────────────────────────────────────────
const frontendDir = fs.existsSync(path.resolve(__dirname, 'apps/frontend/out'))
  ? path.resolve(__dirname, 'apps/frontend/out')
  : (fs.existsSync(path.resolve(__dirname, 'public_html'))
      ? path.resolve(__dirname, 'public_html')
      : path.resolve(__dirname, 'out'));

const uploadsDir = path.resolve(__dirname, 'apps/admin/uploads');
const adminPublicDir = path.resolve(__dirname, 'apps/admin/public');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('> [Server] Frontend dir:', frontendDir);
console.log('> [Server] Uploads dir:', uploadsDir);

// Función de copia recursiva robusta
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    try {
      if (entry.isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (_) {}
  }
}

const rootHtaccess = `<IfModule mod_mime.c>
  AddType text/css .css
  AddType application/javascript .js .mjs
  AddType application/json .json
  AddType font/woff2 .woff2
  AddType font/woff .woff
  AddType font/ttf .ttf
  AddType image/svg+xml .svg
  AddType image/webp .webp
  AddType image/png .png
  AddType image/jpeg .jpg .jpeg
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(js|mjs|css|woff2|woff|ttf|svg|webp|png|jpg|jpeg|ico|json)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. API Subdomain / Rutas -> Reenviar a Node.js
  RewriteCond %{HTTP_HOST} ^api\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  # 2. Admin Subdomain / Rutas -> Reenviar a Node.js
  RewriteCond %{HTTP_HOST} ^admin\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/admin [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

  # 3. Acceso directo a _next/ y uploads/ (NUNCA REESCRIBIR A index.html)
  RewriteRule ^_next/ - [L]
  RewriteRule ^uploads/ - [L]

  # 4. Servir archivos estáticos reales directamente si existen
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 5. Fallback de Next.js SPA
  RewriteRule ^foto/.*$ /foto/[slug]/index.html [L]
  RewriteRule ^.*$ /index.html [L]
</IfModule>
`;

// ── Sincronizar frontend a public_html en tiempo de ejecución ─────────────────
try {
  const pubTargets = [
    path.resolve(__dirname, 'public_html'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html',
    '/home/u251936581/public_html'
  ];
  if (process.env.HOME) {
    pubTargets.push(path.resolve(process.env.HOME, 'public_html'));
    pubTargets.push(path.resolve(process.env.HOME, 'domains/beardedmountaineerlodge.com/public_html'));
  }
  const uniqueTargets = Array.from(new Set(pubTargets));

  uniqueTargets.forEach(target => {
    if (frontendDir && target !== frontendDir) {
      try {
        copyDirRecursive(frontendDir, target);
        fs.writeFileSync(path.join(target, '.htaccess'), rootHtaccess, 'utf8');
        console.log('> [Server] Synchronized frontend & .htaccess to:', target);
      } catch (err) {
        console.error('> [Server] Warning syncing to', target, err.message);
      }
    }
  });
} catch (e) {
  console.error('> [Server] Warning syncing to public_html:', e.message);
}

// ── 1. CARGAR BACKEND API Y ADMIN IN-PROCESS (ASÍNCRONO CON PATH TO FILE URL) ──
let backendApp = null;
const resolvedBackendPath = fs.existsSync(path.resolve(__dirname, 'apps/backend/dist/index.js'))
  ? path.resolve(__dirname, 'apps/backend/dist/index.js')
  : path.resolve(__dirname, 'apps/backend/src/index.js');

import(pathToFileURL(resolvedBackendPath).href)
  .then(function(m) {
    backendApp = m.default || m.app || m;
    console.log('> [Server] Backend API montado exitosamente desde:', resolvedBackendPath);
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
      console.log('> [Server] Admin Panel EJS montado exitosamente desde:', resolvedAdminPath);
    })
    .catch(function(err) {
      console.error('> [Server] Error admin panel:', err.message);
    });
}

// ── 2. ARCHIVOS ESTÁTICOS DE MEDIOS (UPLOADS Y ASSETS) ────────────────────────
app.use('/admin/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));
app.use('/admin/static', express.static(adminPublicDir));
app.use('/static', express.static(adminPublicDir));

// ── 3. RUTEO DE API Y CABECERAS CORS ─────────────────────────────────────────
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

// ── 4. RUTEO DE ADMIN ────────────────────────────────────────────────────────
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

// ── 6. ESCUCHA DE PUERTO ─────────────────────────────────────────────────────
const port = process.env.PORT || process.env.GATEWAY_PORT || 8080;
const server = app.listen(port, function() {
  console.log('> [Server] Bearded Mountaineer Lodge corriendo en puerto:', port);
});

server.on('error', function(err) {
  if (err.code !== 'EADDRINUSE') {
    console.error('> [Server Error]:', err.message);
  }
});

module.exports = app;
