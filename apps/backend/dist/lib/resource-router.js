import { Router } from 'express';
import { AppResponse } from '@antigravity/shared/utils/response';
import { AppError } from '@antigravity/shared/utils/errors';
export function createResourceRouter(options) {
    const { model, select, label, singularLabel, key, transform, fallbackData } = options;
    const map = transform ?? ((item) => item);
    const router = Router();
    const notFoundError = () => new AppError('NOT_FOUND', `${singularLabel} no encontrado`, 404);
    router.get('/', async (_req, res) => {
        try {
            const items = await model.findMany({ select });
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
    router.get('/:key', async (req, res) => {
        const rawKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
        try {
            const item = await model.findUnique({ where: { [key]: rawKey }, select });
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
    return router;
}
//# sourceMappingURL=resource-router.js.map