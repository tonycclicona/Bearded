import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/error-handler.js';
import { ensureTablesExist } from './lib/init-db.js';
import passesRouter from './routes/passes.js';
import routesRouter from './routes/routes.js';
import roomsRouter from './routes/rooms.js';
import experiencesRouter from './routes/experiences.js';
import photosRouter from './routes/photos.js';
import workshopsRouter from './routes/workshops.js';
import spotsRouter from './routes/spots.js';
import checkoutRouter from './routes/checkout.js';
import colibriesRouter from './routes/colibries.js';
import puntosGisRouter from './routes/puntos-gis.js';
import toursRouter from './routes/tours.js';
import guiasRouter from './routes/guias.js';
import bookingsRouter from './routes/bookings.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
const PORT = process.env.PORT || 4000;

// Inicialización de tablas MySQL bajo demanda/arranque (Patrón Unu-Raymi)
ensureTablesExist().catch((err) => {
  console.warn('[init-db] Error en arranque:', err.message);
});

// Middleware de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS resiliente (Patrón Unu-Raymi — nunca bloquea con 500 origin checks)
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (
      origin.includes('beardedmountaineerlodge.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie'],
  credentials: true
}));

// Preflight inmediato para peticiones OPTIONS (Compatible con Express 5)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Auth routes (para login del panel de administración)
app.use('/api/auth', authRouter);
app.use('/auth', authRouter);

// Upload routes (subida de imágenes y documentos)
app.use('/api/upload', uploadRouter);
app.use('/upload', uploadRouter);

// Servir archivos subidos estáticamente con CORS habilitado
const rootDir = fs.existsSync(path.resolve(process.cwd(), 'admin'))
  ? process.cwd()
  : path.resolve(process.cwd(), '..');
const uploadsDir = path.resolve(rootDir, 'admin/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

// Routes (compatibilidad dual: con /api/ y directa para subdominio api.)
app.use('/api/passes', passesRouter);
app.use('/passes', passesRouter);

app.use('/api/routes', routesRouter);
app.use('/routes', routesRouter);

app.use('/api/rooms', roomsRouter);
app.use('/rooms', roomsRouter);

app.use('/api/experiences', experiencesRouter);
app.use('/experiences', experiencesRouter);

app.use('/api/photos', photosRouter);
app.use('/photos', photosRouter);

app.use('/api/workshops', workshopsRouter);
app.use('/workshops', workshopsRouter);

app.use('/api/hummingbird-spots', spotsRouter);
app.use('/hummingbird-spots', spotsRouter);

app.use('/api/checkout', checkoutRouter);
app.use('/checkout', checkoutRouter);

app.use('/api/colibries', colibriesRouter);
app.use('/colibries', colibriesRouter);

app.use('/api/puntos-gis', puntosGisRouter);
app.use('/puntos-gis', puntosGisRouter);

app.use('/api/tours', toursRouter);
app.use('/tours', toursRouter);

app.use('/api/guias', guiasRouter);
app.use('/guias', guiasRouter);

app.use('/api/bookings', bookingsRouter);
app.use('/bookings', bookingsRouter);

// API Welcome & Health check (Homologado con Unu-Raymi)
app.get(['/', '/api'], (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    name: 'Bearded Mountaineer Lodge API Server',
    message: 'La API de Bearded Mountaineer Lodge está operativa.',
    status: 'ok',
    service: 'Bearded Mountaineer Lodge API Gateway',
    endpoints: {
      health: '/api/health',
      passes: '/api/passes',
      routes: '/api/routes',
      rooms: '/api/rooms',
      experiences: '/api/experiences',
      photos: '/api/photos',
      workshops: '/api/workshops',
      spots: '/api/spots',
      colibries: '/api/colibries',
      puntosGis: '/api/puntos-gis',
      tours: '/api/tours',
      guias: '/api/guias',
      bookings: '/api/bookings',
      checkout: '/api/checkout'
    },
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Bearded Mountaineer Lodge API está funcionando correctamente.',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para forzar sincronización / verificación de base de datos MySQL (Patrón Unu-Raymi)
app.get(['/api/db-sync', '/db-sync'], async (_req: Request, res: Response) => {
  try {
    await ensureTablesExist();
    res.json({
      success: true,
      message: 'Esquema y tablas MySQL de Bearded verificadas y sincronizadas exitosamente.',
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error en sincronización';
    res.status(500).json({ success: false, error: message });
  }
});

// Manejador 404 para endpoints de API no encontrados
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.method} ${req.path} no encontrada en Bearded API.`
  });
});

// Error handling
app.use(errorHandler);

if (process.env.UNIFIED_SERVER !== 'true') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;