import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { LocalStore } from '../lib/store.js';
const router = Router();
// GET /api/puntos-gis
router.get('/', async (req, res, _next) => {
    try {
        const { categoria, departamento } = req.query;
        const where = { activo: true };
        if (categoria && typeof categoria === 'string' && categoria !== 'TODOS') {
            where.categoria = categoria;
        }
        if (departamento && typeof departamento === 'string') {
            where.departamento = { contains: departamento, mode: 'insensitive' };
        }
        const puntos = await prisma.puntoGIS.findMany({
            where,
            select: {
                id: true,
                nombre: true,
                slug: true,
                categoria: true,
                departamento: true,
                latitud: true,
                longitud: true,
                altitudMsnm: true,
                mejorTemporada: true,
                acceso: true,
                descripcion: true,
                fotoUrl: true,
                activo: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                id: 'asc'
            }
        });
        if (puntos && puntos.length > 0) {
            const parsed = puntos.map((p) => ({
                ...p,
                latitud: Number(p.latitud),
                longitud: Number(p.longitud)
            }));
            res.json(AppResponse.success(parsed));
            return;
        }
    }
    catch (error) {
        console.warn('[API] puntos-gis findMany failed, serving LocalStore:', error.message);
    }
    const items = LocalStore.getAll('puntos-gis');
    res.json(AppResponse.success(items));
});
// GET /api/puntos-gis/:slug
router.get('/:slug', async (req, res, next) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    try {
        const punto = await prisma.puntoGIS.findUnique({
            where: { slug },
            select: {
                id: true,
                nombre: true,
                slug: true,
                categoria: true,
                departamento: true,
                latitud: true,
                longitud: true,
                altitudMsnm: true,
                mejorTemporada: true,
                acceso: true,
                descripcion: true,
                fotoUrl: true,
                activo: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (punto) {
            res.json(AppResponse.success({
                ...punto,
                latitud: Number(punto.latitud),
                longitud: Number(punto.longitud)
            }));
            return;
        }
    }
    catch (dbErr) {
        console.warn('[API] puntos-gis findUnique failed, checking LocalStore:', dbErr.message);
    }
    const fallback = LocalStore.getById('puntos-gis', slug, 'slug') || LocalStore.getById('puntos-gis', slug, 'id');
    if (fallback) {
        res.json(AppResponse.success(fallback));
        return;
    }
    next(new AppError('NOT_FOUND', 'Punto GIS no encontrado', 404));
});
// POST /api/puntos-gis - Crear punto GIS (LocalStore + DB)
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
    if (payload.latitud !== undefined)
        payload.latitud = Number(payload.latitud) || 0;
    if (payload.longitud !== undefined)
        payload.longitud = Number(payload.longitud) || 0;
    if (payload.altitudMsnm !== undefined)
        payload.altitudMsnm = Number(payload.altitudMsnm) || 2800;
    if (payload.imageUrl && !payload.fotoUrl)
        payload.fotoUrl = payload.imageUrl;
    if (payload.fotoUrl && !payload.imageUrl)
        payload.imageUrl = payload.fotoUrl;
    let dbCreated = null;
    try {
        dbCreated = await prisma.puntoGIS.create({ data: payload });
    }
    catch (error) {
        console.warn('[API] prisma.puntoGIS.create failed, saving in LocalStore:', error.message);
    }
    const saved = LocalStore.create('puntos-gis', dbCreated || payload);
    res.status(201).json(AppResponse.success(saved));
});
// PUT /api/puntos-gis/:id - Actualizar punto GIS (LocalStore + DB)
router.put('/:id', async (req, res) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const numId = parseInt(rawId, 10);
    const payload = { ...req.body };
    if (payload.latitud !== undefined)
        payload.latitud = Number(payload.latitud) || 0;
    if (payload.longitud !== undefined)
        payload.longitud = Number(payload.longitud) || 0;
    if (payload.altitudMsnm !== undefined)
        payload.altitudMsnm = Number(payload.altitudMsnm) || 2800;
    if (payload.imageUrl && !payload.fotoUrl)
        payload.fotoUrl = payload.imageUrl;
    if (payload.fotoUrl && !payload.imageUrl)
        payload.imageUrl = payload.fotoUrl;
    let dbUpdated = null;
    if (!isNaN(numId)) {
        try {
            dbUpdated = await prisma.puntoGIS.update({ where: { id: numId }, data: payload });
        }
        catch (error) {
            console.warn('[API] prisma.puntoGIS.update failed, updating in LocalStore:', error.message);
        }
    }
    const updated = LocalStore.update('puntos-gis', !isNaN(numId) ? numId : rawId, dbUpdated || payload);
    res.json(AppResponse.success(updated));
});
// DELETE /api/puntos-gis/:id - Eliminar punto GIS (LocalStore + DB)
router.delete('/:id', async (req, res) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const numId = parseInt(rawId, 10);
    if (!isNaN(numId)) {
        try {
            await prisma.puntoGIS.delete({ where: { id: numId } });
        }
        catch (error) {
            console.warn('[API] prisma.puntoGIS.delete failed:', error.message);
        }
    }
    LocalStore.delete('puntos-gis', !isNaN(numId) ? numId : rawId);
    res.json(AppResponse.success({ deleted: true, id: rawId }));
});
export default router;
//# sourceMappingURL=puntos-gis.js.map