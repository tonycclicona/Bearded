import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '@antigravity/shared/utils/response';
import { AppError } from '@antigravity/shared/utils/errors';
const router = Router();
// GET /api/guias
router.get('/', async (_req, res, next) => {
    try {
        const guias = await prisma.guia.findMany({
            where: { activo: true },
            select: {
                id: true,
                nombre: true,
                especialidad: true,
                experiencia: true,
                idiomas: true,
                foto: true,
                descripcion: true,
                activo: true,
                orden: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                orden: 'asc'
            }
        });
        res.json(AppResponse.success(guias));
    }
    catch (error) {
        next(error instanceof AppError ? error : new AppError('FETCH_ERROR', 'Error al obtener guías', 500));
    }
});
// GET /api/guias/:id
router.get('/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(rawId, 10);
        if (isNaN(id)) {
            throw new AppError('INVALID_ID', 'ID de guía inválido', 400);
        }
        const guia = await prisma.guia.findUnique({
            where: { id },
            select: {
                id: true,
                nombre: true,
                especialidad: true,
                experiencia: true,
                idiomas: true,
                foto: true,
                descripcion: true,
                activo: true,
                orden: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!guia) {
            throw new AppError('NOT_FOUND', 'Guía no encontrado', 404);
        }
        res.json(AppResponse.success(guia));
    }
    catch (error) {
        next(error instanceof AppError ? error : new AppError('FETCH_ERROR', 'Error al obtener guía', 500));
    }
});
export default router;
//# sourceMappingURL=guias.js.map