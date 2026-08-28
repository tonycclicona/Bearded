/**
 * Servidor Unificado In-Process — BEARDED MOUNTAINEER LODGE
 * Especialmente optimizado para Hostinger (Carpeta única / WebApp única)
 * 
 * Funcionalidad:
 * 1. Frontend: Sirve el build estático exportado de Next.js (apps/frontend/out) -> 0ms delay, cero 504.
 * 2. Backend REST API: Montado directamente in-process para https://api.beardedmountaineerlodge.com y /api/*
 * 3. Admin Panel EJS: Montado directamente in-process para https://admin.beardedmountaineerlodge.com y /admin/*
 * 4. Static Uploads: Servidos instantáneamente en /admin/uploads/* y /uploads/*
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Señal para que backend y admin no abran listeners de puerto duplicados
process.env.UNIFIED_SERVER = 'true';

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 8080;

const frontendOutDir = path.join(__dirname, 'apps/frontend/out');
const uploadsDir = path.join(__dirname, 'apps/admin/uploads');
const adminPublicDir = path.join(__dirname, 'apps/admin/public');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Archivos estáticos globales (Uploads e Iconos)
app.use('/admin/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));
app.use('/admin/static', express.static(adminPublicDir));
app.use('/static', express.static(adminPublicDir));

// 2. Health check del Gateway
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
    frontendExportExists: fs.existsSync(frontendOutDir),
    uploadsDirExists: fs.existsSync(uploadsDir)
  });
});

// 3. Cargar dinámicamente Backend y Admin in-process
let backendApp = null;
let adminApp = null;

try {
  const backendModule = await import('./apps/backend/dist/index.js');
  backendApp = backendModule.default || backendModule;
  console.log('✅ [Unified Server] Backend REST API cargado in-process.');
} catch (e) {
  console.error('❌ [Unified Server] Error cargando Backend API:', e.message);
}

try {
  const adminModule = await import('./apps/admin/dist/index.js');
  adminApp = adminModule.default || adminModule;
  console.log('✅ [Unified Server] Admin Panel EJS cargado in-process.');
} catch (e) {
  console.error('❌ [Unified Server] Error cargando Admin Panel:', e.message);
}

// 4. Enrutamiento Unificado por Subdominio y Rutas
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();

  // A. Subdominio api.beardedmountaineerlodge.com o prefijo /api
  if (host.startsWith('api.') || req.path.startsWith('/api')) {
    if (backendApp) {
      return backendApp(req, res, next);
    }
    return res.status(503).json({ error: 'Backend no disponible' });
  }

  // B. Subdominio admin.beardedmountaineerlodge.com o prefijo /admin
  if (host.startsWith('admin.') || req.path.startsWith('/admin')) {
    if (adminApp) {
      return adminApp(req, res, next);
    }
    return res.status(503).send('<h3>Panel Admin no disponible</h3>');
  }

  next();
});

// 5. Frontend Next.js (Servido directamente desde apps/frontend/out)
if (fs.existsSync(frontendOutDir)) {
  console.log('✅ [Unified Server] Frontend montado desde apps/frontend/out');
  app.use(express.static(frontendOutDir));
  
  app.get('*', (req, res) => {
    // 1. Archivo directo (ej: /favicon.png)
    const directPath = path.join(frontendOutDir, req.path);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
      return res.sendFile(directPath);
    }

    // 2. Archivo HTML (ej: /foto/ensifera-ensifera -> /foto/ensifera-ensifera.html)
    const htmlPath = path.join(frontendOutDir, `${req.path.replace(/\/$/, '')}.html`);
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }

    // 3. Carpeta con index.html (ej: /foto/ensifera-ensifera/index.html)
    const subIndexPath = path.join(frontendOutDir, req.path, 'index.html');
    if (fs.existsSync(subIndexPath)) {
      return res.sendFile(subIndexPath);
    }

    // 4. Fallback a index.html principal
    const mainIndex = path.join(frontendOutDir, 'index.html');
    if (fs.existsSync(mainIndex)) {
      return res.sendFile(mainIndex);
    }

    res.status(404).send('Página no encontrada');
  });
} else {
  console.warn('⚠️ [Unified Server] apps/frontend/out no encontrado. Ejecute npm run build:frontend');
  app.get('*', (_req, res) => {
    res.status(503).send('<h3>Plataforma en mantenimiento... Ejecute npm run build en Hostinger.</h3>');
  });
}

// 6. Iniciar Servidor
app.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`🦅 BEARDED MOUNTAINEER LODGE — SERVIDOR UNIFICADO ACTIVO`);
  console.log(`================================================================`);
  console.log(`📡 Puerto:    ${PORT}`);
  console.log(`🌐 Frontend:  https://beardedmountaineerlodge.com`);
  console.log(`⚙️  Admin:     https://admin.beardedmountaineerlodge.com`);
  console.log(`🔌 REST API:  https://api.beardedmountaineerlodge.com\n`);
});
