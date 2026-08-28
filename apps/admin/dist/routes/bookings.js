import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from './auth.js';
import { str } from './crud.js';
const router = Router();
// GET /admin/bookings - Listado de reservas
router.get('/', requireAuth, async (_req, res) => {
    const bookings = await prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        include: { guests: true }
    });
    res.render('bookings/index', { bookings });
});
// GET /admin/bookings/:id - Detalle de la reserva
router.get('/:id', requireAuth, async (req, res) => {
    const booking = await prisma.booking.findUnique({
        where: { id: String(req.params.id ?? '') },
        include: { guests: true }
    });
    if (!booking) {
        return res.redirect('/admin/bookings');
    }
    res.render('bookings/show', { booking });
});
// POST /admin/bookings/:id/status - Actualizar estado
router.post('/:id/status', requireAuth, async (req, res) => {
    const id = String(req.params.id ?? '');
    await prisma.booking.update({
        where: { id },
        data: {
            status: str(req.body.status)
        }
    });
    res.redirect(`/admin/bookings/${id}`);
});
// POST /admin/bookings/:id/delete - Eliminar reserva
router.post('/:id/delete', requireAuth, async (req, res) => {
    const id = String(req.params.id ?? '');
    await prisma.bookingGuest.deleteMany({ where: { bookingId: id } });
    await prisma.booking.delete({ where: { id } });
    res.redirect('/admin/bookings');
});
export default router;
//# sourceMappingURL=bookings.js.map