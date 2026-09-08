import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from './auth.js';
import { str } from './crud.js';
const router = Router();
router.get('/', requireAuth, async (_req, res) => {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true }
    });
    res.render('orders/index', { orders });
});
router.get('/:id', requireAuth, async (req, res) => {
    const order = await prisma.order.findUnique({
        where: { id: String(req.params.id ?? '') },
        include: { items: true }
    });
    res.render('orders/show', { order });
});
router.post('/:id/status', requireAuth, async (req, res) => {
    const id = String(req.params.id ?? '');
    await prisma.order.update({
        where: { id },
        data: {
            status: str(req.body.status),
            paymentStatus: str(req.body.paymentStatus)
        }
    });
    res.redirect(`/admin/orders/${id}`);
});
router.post('/:id/delete', requireAuth, async (req, res) => {
    await prisma.orderItem.deleteMany({ where: { orderId: String(req.params.id ?? '') } });
    await prisma.order.delete({ where: { id: String(req.params.id ?? '') } });
    res.redirect('/admin/orders');
});
export default router;
//# sourceMappingURL=orders.js.map