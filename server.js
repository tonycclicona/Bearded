/**
 * Servidor Unificado In-Process — BEARDED MOUNTAINEER LODGE
 * Diseñado para Hostinger (Node.js Web App en puerto único)
 * 
 * Funcionalidad:
 * 1. Frontend: Sirve el export estático (public_html o apps/frontend/out)
 * 2. Backend REST API: In-process para https://api.beardedmountaineerlodge.com y /api/*
 * 3. Admin Panel EJS: In-process para https://admin.beardedmountaineerlodge.com y /admin/*
 * 4. Static Uploads: Servidos directamente en /admin/uploads/* y /uploads/*
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

const publicHtmlDir = path.join(__dirname, 'public_html');
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
    publicHtmlExists: fs.existsSync(publicHtmlDir),
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

// 5. Frontend Next.js (Servido desde public_html o apps/frontend/out)
const staticDir = path.resolve(fs.existsSync(publicHtmlDir) ? publicHtmlDir : frontendOutDir);

if (fs.existsSync(staticDir)) {
  console.log(`✅ [Unified Server] Frontend servido desde: ${staticDir}`);
  app.use(express.static(staticDir));
  
  app.use((req, res) => {
    const directPath = path.resolve(staticDir, '.' + req.path);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
      return res.sendFile(directPath);
    }

    const htmlPath = path.resolve(staticDir, `${req.path.replace(/\/$/, '')}.html`);
    if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
      return res.sendFile(htmlPath);
    }

    const subIndexPath = path.resolve(staticDir, '.' + req.path, 'index.html');
    if (fs.existsSync(subIndexPath) && fs.statSync(subIndexPath).isFile()) {
      return res.sendFile(subIndexPath);
    }

    const mainIndex = path.resolve(staticDir, 'index.html');
    if (fs.existsSync(mainIndex)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(fs.readFileSync(mainIndex, 'utf8'));
    }

    res.status(404).send('Página no encontrada');
  });
} else {
  app.use((_req, res) => {
    res.status(503).send('<h3>Plataforma en mantenimiento... Ejecute npm run build.</h3>');
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
