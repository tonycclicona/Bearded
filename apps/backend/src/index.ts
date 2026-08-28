import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
      'https://beardedmountaineerlodge.com',
      'https://www.beardedmountaineerlodge.com',
      'https://admin.beardedmountaineerlodge.com',
      'https://api.beardedmountaineerlodge.com',
      'https://beardedmountaineer.com',
      'https://www.beardedmountaineer.com',
      'https://admin.beardedmountaineer.com',
      'https://api.beardedmountaineer.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.includes('beardedmountaineerlodge.com') ||
      origin.includes('beardedmountaineer.com') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

if (process.env.UNIFIED_SERVER !== 'true') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;