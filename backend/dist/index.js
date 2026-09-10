import express from 'express';
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
// Cargar variables de entorno de forma resiliente
function loadEnvFile(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            content.split('\n').forEach((line) => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const eq = trimmed.indexOf('=');
                    if (eq !== -1) {
                        const key = trimmed.substring(0, eq).trim();
                        let val = trimmed.substring(eq + 1).trim();
                        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                            val = val.substring(1, val.length - 1);
                        }
                        if (key === 'PORT' && process.env.PORT)
                            return;
                        if (!process.env[key])
                            process.env[key] = val;
                    }
                }
            });
        }
        catch (_) { }
    }
}
loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), '.env.production'));
loadEnvFile(path.resolve(process.cwd(), '../.env'));
loadEnvFile(path.resolve(process.cwd(), '../.env.production'));
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'mysql://root:password@localhost:3306/bearded_lodge';
}
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
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
// Pre-flight OPTIONS explícito
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
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
app.use('/api/spots', spotsRouter);
app.use('/spots', spotsRouter);
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
app.get(['/', '/api'], (_req, res) => {
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
            hummingbirdSpots: '/api/hummingbird-spots',
            checkout: '/api/checkout',
            colibries: '/api/colibries',
            puntosGis: '/api/puntos-gis',
            tours: '/api/tours',
            guias: '/api/guias',
            bookings: '/api/bookings'
        }
    });
});
app.get(['/health', '/api/health'], (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Fallback 404 para rutas no contempladas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Ruta ${req.method} ${req.originalUrl} no encontrada en Bearded API.`
    });
});
// Manejador canónico de errores
app.use(errorHandler);
// Iniciar servidor solo si se ejecuta directamente
const isDirectRun = process.env.UNIFIED_SERVER !== 'true';
if (isDirectRun) {
    app.listen(PORT, () => {
        console.log(`[API] Servidor Express activo en puerto local ${PORT}`);
    });
}
export default app;
//# sourceMappingURL=index.js.map