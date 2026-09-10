import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { LocalStore } from '../lib/store.js';
const router = Router();
// GET /api/colibries/catalog-settings
router.get('/catalog-settings', (_req, res) => {
    const settings = LocalStore.getSettings('catalog_settings', {
        pdfUrl: '',
        videoUrl: '',
        title: 'Catálogo Oficial de Aves del Santuario',
        description: 'Descarga nuestro catálogo ornitológico oficial en PDF con la taxonomía y avifauna del Valle Sagrado.'
    });
    res.json(AppResponse.success(settings));
});
// POST & PUT /api/colibries/catalog-settings
const saveCatalogSettings = (req, res) => {
    const payload = req.body || {};
    const current = LocalStore.getSettings('catalog_settings', {
        pdfUrl: '',
        videoUrl: '',
        title: 'Catálogo Oficial de Aves del Santuario',
        description: 'Descarga nuestro catálogo ornitológico oficial en PDF con la taxonomía y avifauna del Valle Sagrado.'
    });
    const updated = LocalStore.setSettings('catalog_settings', {
        ...current,
        ...payload
    });
    res.json(AppResponse.success(updated));
};
router.post('/catalog-settings', saveCatalogSettings);
router.put('/catalog-settings', saveCatalogSettings);
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
    }
    catch (error) {
        console.warn('[API] colibries findMany failed, serving LocalStore:', error.message);
    }
    const items = LocalStore.getAll('colibries');
    res.json(AppResponse.success(items));
});
// GET /api/colibries/:id
router.get('/:id', async (req, res, next) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (!isNaN(id)) {
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
                    createdAt: true,
                    updatedAt: true
                }
            });
            if (colibri) {
                res.json(AppResponse.success(colibri));
                return;
            }
        }
        catch (error) {
            console.warn('[API] colibries findUnique failed, checking LocalStore:', error.message);
        }
    }
    const fallback = LocalStore.getById('colibries', rawId, 'id') || LocalStore.getById('colibries', rawId, 'nombreCientifico');
    if (fallback) {
        res.json(AppResponse.success(fallback));
        return;
    }
    next(new AppError('NOT_FOUND', 'Especie de colibrí no encontrada', 404));
});
// POST /api/colibries - Crear colibrí (LocalStore + DB)
router.post('/', async (req, res) => {
    const payload = { ...req.body };
    if (payload.altitudMinMsnm !== undefined)
        payload.altitudMinMsnm = Number(payload.altitudMinMsnm) || 1500;
    if (payload.altitudMaxMsnm !== undefined)
        payload.altitudMaxMsnm = Number(payload.altitudMaxMsnm) || 3200;
    if (payload.imageUrl && !payload.fotoPrincipal)
        payload.fotoPrincipal = payload.imageUrl;
    if (payload.foto && !payload.fotoPrincipal)
        payload.fotoPrincipal = payload.foto;
    if (payload.fotoPrincipal && !payload.imageUrl)
        payload.imageUrl = payload.fotoPrincipal;
    let dbCreated = null;
    try {
        dbCreated = await prisma.especieColibri.create({ data: payload });
    }
    catch (error) {
        console.warn('[API] prisma.especieColibri.create failed, saving in LocalStore:', error.message);
    }
    const saved = LocalStore.create('colibries', dbCreated || payload);
    res.status(201).json(AppResponse.success(saved));
});
// PUT /api/colibries/:id - Actualizar colibrí (LocalStore + DB)
router.put('/:id', async (req, res) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    const payload = { ...req.body };
    if (payload.altitudMinMsnm !== undefined)
        payload.altitudMinMsnm = Number(payload.altitudMinMsnm) || 1500;
    if (payload.altitudMaxMsnm !== undefined)
        payload.altitudMaxMsnm = Number(payload.altitudMaxMsnm) || 3200;
    if (payload.imageUrl && !payload.fotoPrincipal)
        payload.fotoPrincipal = payload.imageUrl;
    if (payload.foto && !payload.fotoPrincipal)
        payload.fotoPrincipal = payload.foto;
    if (payload.fotoPrincipal && !payload.imageUrl)
        payload.imageUrl = payload.fotoPrincipal;
    let dbUpdated = null;
    if (!isNaN(id)) {
        try {
            dbUpdated = await prisma.especieColibri.update({ where: { id }, data: payload });
        }
        catch (error) {
            console.warn('[API] prisma.especieColibri.update failed, updating in LocalStore:', error.message);
        }
    }
    const updated = LocalStore.update('colibries', !isNaN(id) ? id : rawId, dbUpdated || payload);
    res.json(AppResponse.success(updated));
});
// DELETE /api/colibries/:id - Eliminar colibrí (LocalStore + DB)
router.delete('/:id', async (req, res) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (!isNaN(id)) {
        try {
            await prisma.especieColibri.delete({ where: { id } });
        }
        catch (error) {
            console.warn('[API] prisma.especieColibri.delete failed:', error.message);
        }
    }
    LocalStore.delete('colibries', !isNaN(id) ? id : rawId);
    res.json(AppResponse.success({ deleted: true, id: rawId }));
});
export default router;
//# sourceMappingURL=colibries.js.map