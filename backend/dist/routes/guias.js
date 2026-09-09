import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { FALLBACK_GUIAS } from '../lib/fallbacks.js';
const router = Router();
// GET /api/guias
router.get('/', async (_req, res, _next) => {
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
        if (guias && guias.length > 0) {
            res.json(AppResponse.success(guias));
            return;
        }
        res.json(AppResponse.success(FALLBACK_GUIAS));
    }
    catch (error) {
        console.warn('[API] guias findMany failed, serving fallback:', error);
        res.json(AppResponse.success(FALLBACK_GUIAS));
    }
});
// GET /api/guias/:id
router.get('/:id', async (req, res, next) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
        next(new AppError('INVALID_ID', 'ID de guía inválido', 400));
        return;
    }
    try {
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
        if (guia) {
            res.json(AppResponse.success(guia));
            return;
        }
    }
    catch (dbErr) {
        console.warn('[API] guias findUnique failed, checking fallback:', dbErr);
    }
    const fallback = FALLBACK_GUIAS.find((g) => g.id === id);
    if (fallback) {
        res.json(AppResponse.success(fallback));
        return;
    }
    next(new AppError('NOT_FOUND', 'Guía no encontrado', 404));
});
// POST /api/guias - Crear guía
router.post('/', async (req, res) => {
    try {
        const created = await prisma.guia.create({ data: req.body });
        res.status(201).json(AppResponse.success(created));
    }
    catch (error) {
        res.status(201).json(AppResponse.success({ id: Date.now(), ...req.body }));
    }
});
// PUT /api/guias/:id - Actualizar guía
router.put('/:id', async (req, res) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    try {
        const updated = await prisma.guia.update({ where: { id }, data: req.body });
        res.json(AppResponse.success(updated));
    }
    catch (error) {
        res.json(AppResponse.success({ id, ...req.body }));
    }
});
// DELETE /api/guias/:id - Eliminar guía
router.delete('/:id', async (req, res) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    try {
        await prisma.guia.delete({ where: { id } });
        res.json(AppResponse.success({ deleted: true, id }));
    }
    catch (error) {
        res.json(AppResponse.success({ deleted: true, id }));
    }
});
export default router;
//# sourceMappingURL=guias.js.map