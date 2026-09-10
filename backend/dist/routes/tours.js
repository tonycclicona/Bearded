import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { LocalStore } from '../lib/store.js';
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
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                id: 'asc'
            }
        });
        if (tours && tours.length > 0) {
            res.json(AppResponse.success(tours));
            return;
        }
    }
    catch (error) {
        console.warn('[API] tours findMany failed, serving LocalStore:', error.message);
    }
    const items = LocalStore.getAll('tours');
    res.json(AppResponse.success(items));
});
// GET /api/tours/:slug
router.get('/:slug', async (req, res, next) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    try {
        const tour = await prisma.tour.findUnique({
            where: { slug },
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
                createdAt: true,
                updatedAt: true
            }
        });
        if (tour) {
            res.json(AppResponse.success(tour));
            return;
        }
    }
    catch (dbErr) {
        console.warn('[API] tours findUnique failed, checking LocalStore:', dbErr.message);
    }
    const fallback = LocalStore.getById('tours', slug, 'slug') || LocalStore.getById('tours', slug, 'id');
    if (fallback) {
        res.json(AppResponse.success(fallback));
        return;
    }
    next(new AppError('NOT_FOUND', 'Tour no encontrado', 404));
});
// POST /api/tours - Crear tour (LocalStore + DB)
router.post('/', async (req, res) => {
    const payload = { ...req.body };
    if (!payload.slug && payload.nombre) {
        payload.slug = payload.nombre
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }
    if (payload.precio_adulto !== undefined)
        payload.precio_adulto = Number(payload.precio_adulto) || 0;
    if (payload.precio_adulto_usd !== undefined)
        payload.precio_adulto_usd = Number(payload.precio_adulto_usd) || 0;
    if (payload.duracion_dias !== undefined)
        payload.duracion_dias = Number(payload.duracion_dias) || 1;
    if (payload.cupos_disponibles !== undefined)
        payload.cupos_disponibles = Number(payload.cupos_disponibles) || 10;
    let dbCreated = null;
    try {
        dbCreated = await prisma.tour.create({ data: payload });
    }
    catch (error) {
        console.warn('[API] prisma.tour.create failed, saving in LocalStore:', error.message);
    }
    const saved = LocalStore.create('tours', dbCreated || payload);
    res.status(201).json(AppResponse.success(saved));
});
// PUT /api/tours/:id - Actualizar tour (LocalStore + DB)
router.put('/:id', async (req, res) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    const payload = { ...req.body };
    if (payload.precio_adulto !== undefined)
        payload.precio_adulto = Number(payload.precio_adulto) || 0;
    if (payload.precio_adulto_usd !== undefined)
        payload.precio_adulto_usd = Number(payload.precio_adulto_usd) || 0;
    if (payload.duracion_dias !== undefined)
        payload.duracion_dias = Number(payload.duracion_dias) || 1;
    if (payload.cupos_disponibles !== undefined)
        payload.cupos_disponibles = Number(payload.cupos_disponibles) || 10;
    let dbUpdated = null;
    if (!isNaN(id)) {
        try {
            dbUpdated = await prisma.tour.update({ where: { id }, data: payload });
        }
        catch (error) {
            console.warn('[API] prisma.tour.update failed, updating in LocalStore:', error.message);
        }
    }
    const updated = LocalStore.update('tours', !isNaN(id) ? id : rawId, dbUpdated || payload);
    res.json(AppResponse.success(updated));
});
// DELETE /api/tours/:id - Eliminar tour (LocalStore + DB)
router.delete('/:id', async (req, res) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (!isNaN(id)) {
        try {
            await prisma.tour.delete({ where: { id } });
        }
        catch (error) {
            console.warn('[API] prisma.tour.delete failed:', error.message);
        }
    }
    LocalStore.delete('tours', !isNaN(id) ? id : rawId);
    res.json(AppResponse.success({ deleted: true, id: rawId }));
});
export default router;
//# sourceMappingURL=tours.js.map