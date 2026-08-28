import { Router } from 'express';
import { AppResponse } from '@antigravity/shared/utils/response';
import { AppError } from '@antigravity/shared/utils/errors';
export function createResourceRouter(options) {
    const { model, select, label, singularLabel, key, transform } = options;
    const map = transform ?? ((item) => item);
    const router = Router();
    const notFoundError = () => new AppError('NOT_FOUND', `${singularLabel} no encontrado`, 404);
    router.get('/', async (_req, res) => {
        try {
            const items = await model.findMany({ select });
            res.json(AppResponse.success(items.map(map)));
        }
        catch {
            throw new AppError('FETCH_ERROR', `Error al obtener ${label}`, 500);
        }
    });
    router.get('/:key', async (req, res) => {
        try {
            const item = await model.findUnique({ where: { [key]: req.params.key }, select });
            if (!item) {
                throw notFoundError();
            }
            res.json(AppResponse.success(map(item)));
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            throw new AppError('FETCH_ERROR', `Error al obtener ${singularLabel}`, 500);
        }
    });
    return router;
}
//# sourceMappingURL=resource-router.js.map