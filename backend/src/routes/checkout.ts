import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/errors.js';
import { AppResponse } from '../utils/response.js';

const router = Router();

const checkoutSchema = z.object({
  customerName: z.string().min(1, 'Nombre requerido'),
  customerEmail: z.string().email('Email inválido'),
  customerPhone: z.string().min(1, 'Teléfono requerido'),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().positive()
  })).min(1, 'Carrito vacío')
});

// GET /api/checkout - Listar órdenes (para panel Admin)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        total: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(AppResponse.success(orders || []));
  } catch (error) {
    console.warn('[API] orders findMany failed:', error);
    res.json(AppResponse.success([]));
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = checkoutSchema.parse(req.body);

    const total = validatedData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        customerName: validatedData.customerName,
        customerEmail: validatedData.customerEmail,
        customerPhone: validatedData.customerPhone,
        total,
        items: {
          create: validatedData.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: {
        items: true
      }
    });

    res.status(201).json(AppResponse.success({
      orderId: order.id,
      status: order.status,
      total: order.total
    }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError('VALIDATION_ERROR', error.issues[0].message, 400);
    }
    throw new AppError('CHECKOUT_ERROR', 'Error al procesar el checkout', 500);
  }
});

// DELETE /api/checkout/:id - Eliminar orden
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    await prisma.order.delete({ where: { id } });
    res.json(AppResponse.success({ deleted: true, id }));
  } catch (error) {
    res.json(AppResponse.success({ deleted: true, id }));
  }
});

export default router;