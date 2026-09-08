import { Router, Request, Response } from 'express';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

interface ResourceController<T> {
  findMany(filter: unknown): Promise<T[]>;
  findUnique(filter: unknown): Promise<T | null>;
}

interface ResourceRouterOptions<T, F = unknown> {
  model: ResourceController<T>;
  select: Record<string, boolean>;
  label: string;
  singularLabel: string;
  key: 'id' | 'slug';
  transform?: (item: T) => unknown;
  fallbackData?: F[];
}

export function createResourceRouter<T, F = unknown>(options: ResourceRouterOptions<T, F>): Router {
  const { model, select, label, singularLabel, key, transform, fallbackData } = options;
  const map = transform ?? ((item: T) => item);
  const router = Router();

  const notFoundError = (): AppError =>
    new AppError('NOT_FOUND', `${singularLabel} no encontrado`, 404);

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const items = await model.findMany({ select });
      if (items && items.length > 0) {
        res.json(AppResponse.success(items.map(map)));
        return;
      }
      if (fallbackData && fallbackData.length > 0) {
        res.json(AppResponse.success(fallbackData.map((item) => (transform ? transform(item as unknown as T) : item))));
        return;
      }
      res.json(AppResponse.success([]));
    } catch (dbErr) {
      console.warn(`[API] DB fetch failed for ${label}, using fallback data:`, dbErr);
      if (fallbackData && fallbackData.length > 0) {
        res.json(AppResponse.success(fallbackData.map((item) => (transform ? transform(item as unknown as T) : item))));
        return;
      }
      res.json(AppResponse.success([]));
    }
  });

  router.get('/:key', async (req: Request, res: Response) => {
    const rawKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    try {
      const item: T | null = await model.findUnique({ where: { [key]: rawKey }, select });
      if (item) {
        res.json(AppResponse.success(map(item)));
        return;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.warn(`[API] DB fetchUnique failed for ${singularLabel}, using fallback if found:`, error);
    }

    if (fallbackData) {
      const fallbackItem = fallbackData.find((f) => String((f as Record<string, unknown>)[key]) === String(rawKey));
      if (fallbackItem) {
        res.json(AppResponse.success(transform ? transform(fallbackItem as unknown as T) : fallbackItem));
        return;
      }
    }

    throw notFoundError();
  });

  return router;
}