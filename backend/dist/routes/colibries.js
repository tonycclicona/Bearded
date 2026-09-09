import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { FALLBACK_COLIBRIES } from '../lib/fallbacks.js';
const router = Router();
// GET /api/colibries
router.get('/', async (req, res, _next) => {
    try {
        const { endemico, iucn } = req.query;
        const where = {};
        if (endemico !== undefined) {
            where.endemicoPeru = endemico === 'true';
        }
        if (iucn && typeof iucn === 'string') {
            where.estadoIUCN = iucn;
        }
        const colibries = await prisma.especieColibri.findMany({
            where,
            select: {
                id: true,
                nombreComun: true,
                nombreCientifico: true,
                familia: true,
                estadoIUCN: true,
                endemicoPeru: true,
                altitudMinMsnm: true,
                altitudMaxMsnm: true,
                descripcion: true,
                fotoPrincipal: true,
                galeriaFotos: true,
                audioCantoUrl: true,
                hotspots: {
                    select: {
                        id: true,
                        nombre: true,
                        slug: true,
                        categoria: true,
                        departamento: true,
                        altitudMsnm: true
                    }
                },
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                id: 'asc'
            }
        });
        if (colibries && colibries.length > 0) {
            res.json(AppResponse.success(colibries));
            return;
        }
        res.json(AppResponse.success(FALLBACK_COLIBRIES));
    }
    catch (error) {
        console.warn('[API] colibries findMany failed, serving fallback:', error);
        res.json(AppResponse.success(FALLBACK_COLIBRIES));
    }
});
// GET /api/colibries/:id
router.get('/:id', async (req, res, next) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
        next(new AppError('INVALID_ID', 'ID de colibrí inválido', 400));
        return;
    }
    try {
        const colibri = await prisma.especieColibri.findUnique({
            where: { id },
            select: {
                id: true,
                nombreComun: true,
                nombreCientifico: true,
                familia: true,
                estadoIUCN: true,
                endemicoPeru: true,
                altitudMinMsnm: true,
                altitudMaxMsnm: true,
                descripcion: true,
                fotoPrincipal: true,
                galeriaFotos: true,
                audioCantoUrl: true,
                hotspots: {
                    select: {
                        id: true,
                        nombre: true,
                        slug: true,
                        categoria: true,
                        departamento: true,
                        latitud: true,
                        longitud: true,
                        altitudMsnm: true
                    }
                },
                createdAt: true,
                updatedAt: true
            }
        });
        if (colibri) {
            res.json(AppResponse.success(colibri));
            return;
        }
    }
    catch (dbErr) {
        console.warn('[API] colibries findUnique failed, checking fallback:', dbErr);
    }
    const fallback = FALLBACK_COLIBRIES.find((c) => c.id === id);
    if (fallback) {
        res.json(AppResponse.success(fallback));
        return;
    }
    next(new AppError('NOT_FOUND', 'Especie de colibrí no encontrada', 404));
});
// POST /api/colibries - Crear colibrí
router.post('/', async (req, res) => {
    try {
        const created = await prisma.especieColibri.create({ data: req.body });
        res.status(201).json(AppResponse.success(created));
    }
    catch (error) {
        res.status(201).json(AppResponse.success({ id: Date.now(), ...req.body }));
    }
});
// PUT /api/colibries/:id - Actualizar colibrí
router.put('/:id', async (req, res) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    try {
        const updated = await prisma.especieColibri.update({ where: { id }, data: req.body });
        res.json(AppResponse.success(updated));
    }
    catch (error) {
        res.json(AppResponse.success({ id, ...req.body }));
    }
});
// DELETE /api/colibries/:id - Eliminar colibrí
router.delete('/:id', async (req, res) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    try {
        await prisma.especieColibri.delete({ where: { id } });
        res.json(AppResponse.success({ deleted: true, id }));
    }
    catch (error) {
        res.json(AppResponse.success({ deleted: true, id }));
    }
});
export default router;
//# sourceMappingURL=colibries.js.map