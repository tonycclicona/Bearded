import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '@antigravity/shared/utils/response';
import { AppError } from '@antigravity/shared/utils/errors';
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
export default router;
//# sourceMappingURL=colibries.js.map