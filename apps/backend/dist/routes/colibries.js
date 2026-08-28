import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '@antigravity/shared/utils/response';
import { AppError } from '@antigravity/shared/utils/errors';
const router = Router();
// GET /api/colibries
router.get('/', async (req, res, next) => {
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
        res.json(AppResponse.success(colibries));
    }
    catch (error) {
        next(error instanceof AppError ? error : new AppError('FETCH_ERROR', 'Error al obtener especies de colibríes', 500));
    }
});
// GET /api/colibries/:id
router.get('/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(rawId, 10);
        if (isNaN(id)) {
            throw new AppError('INVALID_ID', 'ID de colibrí inválido', 400);
        }
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
        if (!colibri) {
            throw new AppError('NOT_FOUND', 'Especie de colibrí no encontrada', 404);
        }
        res.json(AppResponse.success(colibri));
    }
    catch (error) {
        next(error instanceof AppError ? error : new AppError('FETCH_ERROR', 'Error al obtener colibrí', 500));
    }
});
export default router;
//# sourceMappingURL=colibries.js.map