import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dashboardRouter from './routes/dashboard.js';
import passesRouter from './routes/passes.js';
import spotsRouter from './routes/spots.js';
import routesRouter from './routes/routes.js';
import roomsRouter from './routes/rooms.js';
import experiencesRouter from './routes/experiences.js';
import photosRouter from './routes/photos.js';
import workshopsRouter from './routes/workshops.js';
import ordersRouter from './routes/orders.js';
import bookingsRouter from './routes/bookings.js';
import authRouter from './routes/auth.js';
import puntosGisRouter from './routes/puntos-gis.js';
import colibriesRouter from './routes/colibries.js';
import toursRouter from './routes/tours.js';
import guiasRouter from './routes/guias.js';
import { uploadsDir } from './lib/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.ADMIN_PORT || 3002;

fs.mkdirSync(uploadsDir, { recursive: true });

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'admin-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Inyectar currentPath para el sidebar activo
app.use((req, res, next) => {
  res.locals.currentPath = req.originalUrl || req.path;
  next();
});

// Static files
app.use('/admin/static', express.static(path.join(__dirname, 'public')));
app.use('/admin/uploads', express.static(uploadsDir));

// Routes
app.use('/admin', authRouter);
app.use('/admin', dashboardRouter);
app.use('/admin/bookings', bookingsRouter);
app.use('/admin/puntos-gis', puntosGisRouter);
app.use('/admin/colibries', colibriesRouter);
app.use('/admin/tours', toursRouter);
app.use('/admin/guias', guiasRouter);
app.use('/admin/passes', passesRouter);
app.use('/admin/spots', spotsRouter);
app.use('/admin/routes', routesRouter);
app.use('/admin/rooms', roomsRouter);
app.use('/admin/experiences', experiencesRouter);
app.use('/admin/photos', photosRouter);
app.use('/admin/workshops', workshopsRouter);
app.use('/admin/orders', ordersRouter);

// Redirect root to admin
app.get('/', (_req, res) => {
  res.redirect('/admin');
});

app.listen(PORT, () => {
  console.log(`Admin panel running on http://localhost:${PORT}/admin`);
});

export default app;