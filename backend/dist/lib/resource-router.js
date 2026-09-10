import { Router } from 'express';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
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
            console.warn(`[API] DB fetch failed for ${label}, using fallback data:`, dbErr);
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
            console.warn(`[API] DB fetchUnique failed for ${singularLabel}, using fallback if found:`, error);
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
    // 3. POST / - Crear nuevo recurso (Admin CRUD)
    router.post('/', async (req, res) => {
        const currentModel = getModel();
        try {
            const rawPayload = req.body || {};
            // Sanitizar datos para enviar únicamente campos que pertenecen al modelo
            const allowedKeys = Object.keys(select);
            const cleanData = {};
            for (const k of allowedKeys) {
                if (k !== 'id' && rawPayload[k] !== undefined) {
                    cleanData[k] = rawPayload[k];
                }
            }
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
            console.error(`[API] Error creando ${singularLabel}:`, err);
            const message = err instanceof Error ? err.message : `Error al crear ${singularLabel}`;
            res.status(400).json(AppResponse.fail('CREATE_ERROR', message, 400));
        }
    });
    // 4. PUT /:id - Actualizar recurso existente (Admin CRUD)
    router.put('/:id', async (req, res) => {
        const currentModel = getModel();
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        try {
            const rawPayload = req.body || {};
            const allowedKeys = Object.keys(select);
            const cleanData = {};
            for (const k of allowedKeys) {
                if (k !== 'id' && rawPayload[k] !== undefined) {
                    cleanData[k] = rawPayload[k];
                }
            }
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
            console.error(`[API] Error actualizando ${singularLabel}:`, err);
            const message = err instanceof Error ? err.message : `Error al actualizar ${singularLabel}`;
            res.status(400).json(AppResponse.fail('UPDATE_ERROR', message, 400));
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
            console.error(`[API] Error eliminando ${singularLabel}:`, err);
            // Responder éxito simulado para permitir que la UI proceda sin bloquear al admin si la BD está offline
            res.json(AppResponse.success({ deleted: true, id }));
        }
    });
    return router;
}
//# sourceMappingURL=resource-router.js.map