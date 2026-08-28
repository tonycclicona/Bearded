import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '@antigravity/shared/utils/response';
import { AppError } from '@antigravity/shared/utils/errors';
const router = Router();
// GET /api/tours
router.get('/', async (req, res, next) => {
    try {
        const { region, destacado } = req.query;
        const where = { activo: true };
        if (region && typeof region === 'string' && region !== 'TODAS') {
            where.regionRuta = { contains: region, mode: 'insensitive' };
        }
        if (destacado !== undefined) {
            where.destacado = destacado === 'true';
        }
        const tours = await prisma.tour.findMany({
            where,
            select: {
                id: true,
                nombre: true,
                slug: true,
                descripcion: true,
                itinerario: true,
                regionRuta: true,
                nivelCaminata: true,
                equipoOpticoReq: true,
                precio_adulto: true,
                precio_adulto_usd: true,
                precio_nino: true,
                precio_nino_usd: true,
                showPEN: true,
                showUSD: true,
                duracion_dias: true,
                cupos_disponibles: true,
                servicios_incluidos: true,
                servicios_excluidos: true,
                que_llevar: true,
                activo: true,
                destacado: true,
                hotspots: {
                    select: {
                        id: true,
                        nombre: true,
                        slug: true,
                        categoria: true,
                        departamento: true,
                        latitud: true,
                        longitud: true,
                        altitudMsnm: true,
                        fotoUrl: true
                    }
                },
                imagenes: {
                    select: {
                        id: true,
                        url: true,
                        esPortada: true
                    }
                },
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                id: 'asc'
            }
        });
        const parsed = tours.map((t) => ({
            ...t,
            precio_adulto: Number(t.precio_adulto),
            precio_adulto_usd: t.precio_adulto_usd != null ? Number(t.precio_adulto_usd) : null,
            precio_nino: t.precio_nino != null ? Number(t.precio_nino) : null,
            precio_nino_usd: t.precio_nino_usd != null ? Number(t.precio_nino_usd) : null,
            showPEN: t.showPEN ?? true,
            showUSD: t.showUSD ?? false,
            hotspots: t.hotspots.map((h) => ({
                ...h,
                latitud: Number(h.latitud),
                longitud: Number(h.longitud)
            }))
        }));
        res.json(AppResponse.success(parsed));
    }
    catch (error) {
        next(error instanceof AppError ? error : new AppError('FETCH_ERROR', 'Error al obtener tours', 500));
    }
});
// GET /api/tours/:slug
router.get('/:slug', async (req, res, next) => {
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
        const tour = await prisma.tour.findUnique({
            where: { slug },
            include: {
                hotspots: {
                    include: {
                        especies: true
                    }
                },
                imagenes: true
            }
        });
        if (!tour) {
            throw new AppError('NOT_FOUND', 'Tour no encontrado', 404);
        }
        res.json(AppResponse.success({
            ...tour,
            precio_adulto: Number(tour.precio_adulto),
            hotspots: tour.hotspots.map((h) => ({
                ...h,
                latitud: Number(h.latitud),
                longitud: Number(h.longitud)
            }))
        }));
    }
    catch (error) {
        next(error instanceof AppError ? error : new AppError('FETCH_ERROR', 'Error al obtener tour', 500));
    }
});
export default router;
//# sourceMappingURL=tours.js.map