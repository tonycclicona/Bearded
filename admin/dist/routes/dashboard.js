import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from './auth.js';
const router = Router();
router.get('/', requireAuth, async (_req, res) => {
    try {
        const [puntosGis, colibries, tours, guias, passes, spots, routes, rooms, experiences, photos, workshops, orders] = await Promise.all([
            prisma.puntoGIS.count(),
            prisma.especieColibri.count(),
            prisma.tour.count(),
            prisma.guia.count(),
            prisma.hummingbirdPass.count(),
            prisma.hummingbirdSpot.count(),
            prisma.route.count(),
            prisma.room.count(),
            prisma.lodgeExperience.count(),
            prisma.photoProduct.count(),
            prisma.photoWorkshop.count(),
            prisma.order.count()
        ]);
        res.render('dashboard', {
            currentPath: '/admin',
            stats: {
                puntosGis,
                colibries,
                tours,
                guias,
                passes,
                spots,
                routes,
                rooms,
                experiences,
                photos,
                workshops,
                orders
            }
        });
    }
    catch (error) {
        console.error('Error loading dashboard:', error);
        res.render('dashboard', {
            currentPath: '/admin',
            stats: {
                puntosGis: 0,
                colibries: 0,
                tours: 0,
                guias: 0,
                passes: 0,
                spots: 0,
                routes: 0,
                rooms: 0,
                experiences: 0,
                photos: 0,
                workshops: 0,
                orders: 0
            }
        });
    }
});
export default router;
//# sourceMappingURL=dashboard.js.map