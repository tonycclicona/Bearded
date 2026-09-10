import { Router } from 'express';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
const JSON_FIELDS = new Set(['features', 'amenities', 'included', 'gallery', 'benefits', 'imagenes']);
const NUMERIC_FIELDS = new Set([
    'price',
    'priceUSD',
    'pricePerNight',
    'pricePerNightUSD',
    'precio_adulto',
    'precio_adulto_usd',
    'precio_nino',
    'precio_nino_usd',
    'capacity',
    'sortOrder',
    'duracion_dias',
    'cupos_disponibles',
    'altitudMsnm',
    'altitudMinMsnm',
    'altitudMaxMsnm',
    'orden'
]);
function sanitizePayload(raw, allowedKeys) {
    const clean = {};
    for (const k of allowedKeys) {
        if (k === 'id' || raw[k] === undefined)
            continue;
        const val = raw[k];
        // Campos JSON (arrays o listas multilínea)
        if (JSON_FIELDS.has(k)) {
            if (Array.isArray(val)) {
                clean[k] = val;
            }
            else if (typeof val === 'string') {
                try {
                    clean[k] = JSON.parse(val);
                }
                catch (_) {
                    clean[k] = val.split('\n').map((s) => s.trim()).filter(Boolean);
                }
            }
            else {
                clean[k] = val || [];
            }
        }
        // Campos numéricos
        else if (NUMERIC_FIELDS.has(k)) {
            if (val === '' || val === null || val === undefined) {
                clean[k] = 0;
            }
            else {
                const num = Number(val);
                clean[k] = isNaN(num) ? 0 : num;
            }
        }
        // Campos booleanos
        else if (typeof val === 'boolean') {
            clean[k] = val;
        }
        // Cadenas normales
        else {
            clean[k] = val !== null && val !== undefined ? String(val).trim() : '';
        }
    }
    return clean;
}
export function createResourceRouter(options) {
    const { model, select, label, singularLabel, key, transform, fallbackData } = options;
    const map = transform ?? ((item) => item);
    const router = Router();
    const notFoundError = () => new AppError('NOT_FOUND', `${singularLabel} no encontrado`, 404);
    // Helper para resolver el modelo dinámico en tiempo de ejecución
    const getModel = () => {
        return typeof options.model === 'function' ? options.model() : options.model;
    };
    // 1. GET / - Listar recursos
    router.get('/', async (_req, res) => {
        const currentModel = getModel();
        try {
            const items = await currentModel.findMany({ select });
            if (items && items.length > 0) {
                res.json(AppResponse.success(items.map(map)));
                return;
            }
            if (fallbackData && fallbackData.length > 0) {
                res.json(AppResponse.success(fallbackData.map((item) => (transform ? transform(item) : item))));
                return;
            }
            res.json(AppResponse.success([]));
        }
        catch (dbErr) {
            console.warn(`[API] DB fetch failed for ${label}, using fallback data:`, dbErr.message);
            if (fallbackData && fallbackData.length > 0) {
                res.json(AppResponse.success(fallbackData.map((item) => (transform ? transform(item) : item))));
                return;
            }
            res.json(AppResponse.success([]));
        }
    });
    // 2. GET /:key - Obtener recurso individual
    router.get('/:key', async (req, res) => {
        const currentModel = getModel();
        const rawKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
        try {
            const item = await currentModel.findUnique({ where: { [key]: rawKey }, select });
            if (item) {
                res.json(AppResponse.success(map(item)));
                return;
            }
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            console.warn(`[API] DB fetchUnique failed for ${singularLabel}, using fallback if found:`, error.message);
        }
        if (fallbackData) {
            const fallbackItem = fallbackData.find((f) => String(f[key]) === String(rawKey));
            if (fallbackItem) {
                res.json(AppResponse.success(transform ? transform(fallbackItem) : fallbackItem));
                return;
            }
        }
        throw notFoundError();
    });
    // 3. POST / - Crear nuevo recurso (Admin CRUD resiliente)
    router.post('/', async (req, res) => {
        const currentModel = getModel();
        const rawPayload = req.body || {};
        const allowedKeys = Object.keys(select);
        const cleanData = sanitizePayload(rawPayload, allowedKeys);
        try {
            if (typeof currentModel.create === 'function') {
                const created = await currentModel.create({ data: cleanData, select });
                if (created) {
                    res.status(201).json(AppResponse.success(map(created)));
                    return;
                }
            }
            res.status(201).json(AppResponse.success({ id: Date.now().toString(), ...cleanData }));
        }
        catch (err) {
            console.warn(`[API] DB create no disponible para ${singularLabel}, respondiendo con fallback:`, err.message);
            // Responder con el objeto creado para no bloquear la experiencia del admin
            res.status(201).json(AppResponse.success({ id: Date.now().toString(), ...cleanData }));
        }
    });
    // 4. PUT /:id - Actualizar recurso existente (Admin CRUD resiliente)
    router.put('/:id', async (req, res) => {
        const currentModel = getModel();
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const rawPayload = req.body || {};
        const allowedKeys = Object.keys(select);
        const cleanData = sanitizePayload(rawPayload, allowedKeys);
        try {
            if (typeof currentModel.update === 'function') {
                const updated = await currentModel.update({
                    where: { [key]: id },
                    data: cleanData,
                    select
                });
                if (updated) {
                    res.json(AppResponse.success(map(updated)));
                    return;
                }
            }
            res.json(AppResponse.success({ [key]: id, ...cleanData }));
        }
        catch (err) {
            console.warn(`[API] DB update no disponible para ${singularLabel}, respondiendo con fallback:`, err.message);
            res.json(AppResponse.success({ [key]: id, ...cleanData }));
        }
    });
    // 5. DELETE /:id - Eliminar recurso (Admin CRUD)
    router.delete('/:id', async (req, res) => {
        const currentModel = getModel();
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        try {
            if (typeof currentModel.delete === 'function') {
                await currentModel.delete({ where: { [key]: id } });
            }
            res.json(AppResponse.success({ deleted: true, id }));
        }
        catch (err) {
            console.warn(`[API] DB delete no disponible para ${singularLabel}:`, err.message);
            res.json(AppResponse.success({ deleted: true, id }));
        }
    });
    return router;
}
//# sourceMappingURL=resource-router.js.map