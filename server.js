// ==============================================================================
// server.js — Bearded Mountaineer Lodge API Entry Point & Hostinger Bridge
// Compatible con Phusion Passenger, LiteSpeed y ejecución directa Node.js 22
// ==============================================================================

'use strict';

const path = require('path');
const fs = require('fs');

// Cargar variables de entorno si existen archivos .env locales
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
    } catch (_) {}
  }
}

loadEnv(path.resolve(__dirname, '.env.production'));
loadEnv(path.resolve(__dirname, '.env'));
loadEnv(path.resolve(__dirname, 'backend/.env.production'));
loadEnv(path.resolve(__dirname, 'backend/.env'));

// Cargar la aplicación backend compilada
const backendPath = path.resolve(__dirname, 'backend/dist/index.js');
let app;

try {
  const backendModule = require(backendPath);
  app = backendModule.default || backendModule;
} catch (err) {
  console.error('[SERVER BRIDGE] Error al cargar backend/dist/index.js:', err);
  throw err;
}

// Para entornos Phusion Passenger / Hostinger Application Manager
module.exports = app;
