import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '@antigravity/shared/utils/errors';
import { AppResponse } from '@antigravity/shared/utils/response';

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

export default router;