import { Router, Request, Response } from 'express';
import { AppResponse } from '@antigravity/shared/utils/response';
import { AppError } from '@antigravity/shared/utils/errors';

interface ResourceController<T> {
  findMany(filter: unknown): Promise<T[]>;
  findUnique(filter: unknown): Promise<T | null>;
}

interface ResourceRouterOptions<T> {
  model: ResourceController<T>;
  select: Record<string, boolean>;
  label: string;
  singularLabel: string;
  key: 'id' | 'slug';
  transform?: (item: T) => unknown;
}

export function createResourceRouter<T>(options: ResourceRouterOptions<T>): Router {
  const { model, select, label, singularLabel, key, transform } = options;
  const map = transform ?? ((item: T) => item);
  const router = Router();

  const notFoundError = (): AppError =>
    new AppError('NOT_FOUND', `${singularLabel} no encontrado`, 404);

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const items = await model.findMany({ select });
      res.json(AppResponse.success(items.map(map)));
    } catch {
      throw new AppError('FETCH_ERROR', `Error al obtener ${label}`, 500);
    }
  });

  router.get('/:key', async (req: Request, res: Response) => {
    try {
      const item = await model.findUnique({ where: { [key]: req.params.key }, select });
      if (!item) {
        throw notFoundError();
      }
      res.json(AppResponse.success(map(item)));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('FETCH_ERROR', `Error al obtener ${singularLabel}`, 500);
    }
  });

  return router;
}