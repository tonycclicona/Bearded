import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
const PORT = process.env.PORT || 3001;
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
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (origin.includes('beardedmountaineerlodge.com') ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie'],
    credentials: true
}));
// Preflight inmediato para peticiones OPTIONS (Compatible con Express 5)
app.use((req, res, next) => {
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
// API Welcome & Health check
app.get(['/', '/api'], (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Bearded Mountaineer Lodge API Gateway',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/health',
            '/api/passes',
            '/api/routes',
            '/api/rooms',
            '/api/experiences',
            '/api/photos',
            '/api/workshops',
            '/api/hummingbird-spots',
            '/api/colibries',
            '/api/puntos-gis',
            '/api/tours',
            '/api/guias',
            '/api/bookings',
            '/api/checkout'
        ]
    });
});
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Endpoint para forzar sincronización / verificación de base de datos MySQL (Patrón Unu-Raymi)
app.get(['/api/db-sync', '/db-sync'], async (_req, res) => {
    try {
        await ensureTablesExist();
        res.json({
            success: true,
            message: 'Esquema y tablas MySQL de Bearded verificadas y sincronizadas exitosamente.',
            timestamp: new Date().toISOString()
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Error en sincronización';
        res.status(500).json({ success: false, error: message });
    }
});
// Manejador 404 para endpoints de API no encontrados
app.use((req, res) => {
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
//# sourceMappingURL=index.js.map