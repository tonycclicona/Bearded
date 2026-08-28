import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '@antigravity/shared/utils/errors';
import { AppResponse } from '@antigravity/shared/utils/response';
const router = Router();
const createBookingSchema = z.object({
    serviceType: z.enum(['LODGE', 'EXPERIENCIA', 'PASE', 'TOUR', 'TALLER', 'GENERAL']),
    serviceId: z.string().optional().nullable(),
    serviceTitle: z.string().min(1, 'El título del servicio es requerido'),
    bookingDate: z.string().min(1, 'La fecha de reserva es requerida'),
    guestCount: z.number().int().min(1, 'Debe haber al menos 1 persona'),
    unitPrice: z.number().min(0, 'Precio unitario inválido'),
    currency: z.enum(['PEN', 'USD']).default('PEN'),
    primaryName: z.string().min(2, 'El nombre del titular es requerido'),
    primaryEmail: z.string().email('Correo electrónico inválido'),
    primaryPhone: z.string().min(6, 'Número de WhatsApp/teléfono requerido'),
    primaryDoc: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    paymentMethod: z.string().default('YAPE'),
    guests: z.array(z.object({
        name: z.string().min(1, 'Nombre del asistente requerido'),
        documentId: z.string().optional().nullable()
    })).optional()
});
function generateBookingCode() {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `AGY-${timestamp}-${random}`;
}
// POST /api/bookings - Registrar una nueva reserva
router.post('/', async (req, res) => {
    try {
        const validated = createBookingSchema.parse(req.body);
        // Parsear fecha
        const parsedDate = new Date(validated.bookingDate);
        if (isNaN(parsedDate.getTime())) {
            throw new AppError('VALIDATION_ERROR', 'Fecha de reserva no válida', 400);
        }
        const bookingCode = generateBookingCode();
        const totalAmount = Number((validated.unitPrice * validated.guestCount).toFixed(2));
        // Preparar lista de asistentes
        const guestList = validated.guests && validated.guests.length > 0
            ? validated.guests
            : [{ name: validated.primaryName, documentId: validated.primaryDoc || null }];
        const booking = await prisma.booking.create({
            data: {
                bookingCode,
                serviceType: validated.serviceType,
                serviceId: validated.serviceId || null,
                serviceTitle: validated.serviceTitle,
                bookingDate: parsedDate,
                guestCount: validated.guestCount,
                unitPrice: validated.unitPrice,
                totalAmount,
                currency: validated.currency,
                status: 'PENDIENTE_PAGO',
                paymentMethod: validated.paymentMethod,
                primaryName: validated.primaryName,
                primaryEmail: validated.primaryEmail,
                primaryPhone: validated.primaryPhone,
                primaryDoc: validated.primaryDoc || null,
                notes: validated.notes || null,
                guests: {
                    create: guestList.map((g, index) => ({
                        name: g.name,
                        documentId: g.documentId || null,
                        isPrimary: index === 0
                    }))
                }
            },
            select: {
                id: true,
                bookingCode: true,
                serviceType: true,
                serviceTitle: true,
                bookingDate: true,
                guestCount: true,
                unitPrice: true,
                totalAmount: true,
                currency: true,
                status: true,
                paymentMethod: true,
                primaryName: true,
                primaryEmail: true,
                primaryPhone: true,
                primaryDoc: true,
                notes: true,
                guests: {
                    select: {
                        id: true,
                        name: true,
                        documentId: true,
                        isPrimary: true
                    }
                },
                createdAt: true
            }
        });
        res.status(201).json(AppResponse.success(booking));
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new AppError('VALIDATION_ERROR', error.issues[0].message, 400);
        }
        if (error instanceof AppError) {
            throw error;
        }
        console.error('Error al crear reserva:', error);
        throw new AppError('BOOKING_ERROR', 'Error interno al registrar la reserva', 500);
    }
});
// GET /api/bookings/:code - Consultar reserva por código
router.get('/:code', async (req, res) => {
    try {
        const code = String(req.params.code ?? '');
        const booking = await prisma.booking.findUnique({
            where: { bookingCode: code },
            select: {
                id: true,
                bookingCode: true,
                serviceType: true,
                serviceTitle: true,
                bookingDate: true,
                guestCount: true,
                unitPrice: true,
                totalAmount: true,
                currency: true,
                status: true,
                paymentMethod: true,
                primaryName: true,
                primaryEmail: true,
                primaryPhone: true,
                primaryDoc: true,
                notes: true,
                guests: {
                    select: {
                        id: true,
                        name: true,
                        documentId: true,
                        isPrimary: true
                    }
                },
                createdAt: true
            }
        });
        if (!booking) {
            throw new AppError('NOT_FOUND', 'Reserva no encontrada', 404);
        }
        res.json(AppResponse.success(booking));
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        throw new AppError('BOOKING_ERROR', 'Error al consultar la reserva', 500);
    }
});
export default router;
//# sourceMappingURL=bookings.js.map