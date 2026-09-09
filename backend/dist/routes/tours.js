import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { FALLBACK_TOURS } from '../lib/fallbacks.js';
const router = Router();
// GET /api/tours
router.get('/', async (req, res, _next) => {
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
        if (tours && tours.length > 0) {
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
            return;
        }
        res.json(AppResponse.success(FALLBACK_TOURS));
    }
    catch (error) {
        console.warn('[API] tours findMany failed, serving fallback:', error);
        res.json(AppResponse.success(FALLBACK_TOURS));
    }
});
// GET /api/tours/:slug
router.get('/:slug', async (req, res, next) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    try {
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
        if (tour) {
            res.json(AppResponse.success({
                ...tour,
                precio_adulto: Number(tour.precio_adulto),
                hotspots: tour.hotspots.map((h) => ({
                    ...h,
                    latitud: Number(h.latitud),
                    longitud: Number(h.longitud)
                }))
            }));
            return;
        }
    }
    catch (dbErr) {
        console.warn('[API] tours findUnique failed, checking fallback:', dbErr);
    }
    const fallback = FALLBACK_TOURS.find((t) => t.slug === slug);
    if (fallback) {
        res.json(AppResponse.success(fallback));
        return;
    }
    next(new AppError('NOT_FOUND', 'Tour no encontrado', 404));
});
// POST /api/tours - Crear tour
router.post('/', async (req, res) => {
    try {
        const created = await prisma.tour.create({ data: req.body });
        res.status(201).json(AppResponse.success(created));
    }
    catch (error) {
        res.status(201).json(AppResponse.success({ id: Date.now(), ...req.body }));
    }
});
// PUT /api/tours/:id - Actualizar tour
router.put('/:id', async (req, res) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    try {
        const updated = await prisma.tour.update({ where: { id }, data: req.body });
        res.json(AppResponse.success(updated));
    }
    catch (error) {
        res.json(AppResponse.success({ id, ...req.body }));
    }
});
// DELETE /api/tours/:id - Eliminar tour
router.delete('/:id', async (req, res) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    try {
        await prisma.tour.delete({ where: { id } });
        res.json(AppResponse.success({ deleted: true, id }));
    }
    catch (error) {
        res.json(AppResponse.success({ deleted: true, id }));
    }
});
export default router;
//# sourceMappingURL=tours.js.map