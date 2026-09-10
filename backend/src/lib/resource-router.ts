import { Router, Request, Response } from 'express';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { LocalStore } from './store.js';

interface ResourceController<T> {
  findMany(filter: unknown): Promise<T[]>;
  findUnique(filter: unknown): Promise<T | null>;
  create?(data: unknown): Promise<T>;
  update?(data: unknown): Promise<T>;
  delete?(data: unknown): Promise<T>;
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

function sanitizePayload(raw: Record<string, any>, allowedKeys: string[]): Record<string, any> {
  const clean: Record<string, any> = {};

  for (const k of allowedKeys) {
    if (k === 'id' || raw[k] === undefined) continue;
    const val = raw[k];

    if (JSON_FIELDS.has(k)) {
      if (Array.isArray(val)) {
        clean[k] = val;
      } else if (typeof val === 'string') {
        try {
          clean[k] = JSON.parse(val);
        } catch (_) {
          clean[k] = val.split('\n').map((s) => s.trim()).filter(Boolean);
        }
      } else {
        clean[k] = val || [];
      }
    } else if (NUMERIC_FIELDS.has(k)) {
      if (val === '' || val === null || val === undefined) {
        clean[k] = 0;
      } else {
        const num = Number(val);
        clean[k] = isNaN(num) ? 0 : num;
      }
    } else if (typeof val === 'boolean') {
      clean[k] = val;
    } else {
      clean[k] = val !== null && val !== undefined ? String(val).trim() : '';
    }
  }

  // Preservar imageUrl / fotoUrl si están presentes
  if (raw.imageUrl && !clean.imageUrl && allowedKeys.includes('imageUrl')) clean.imageUrl = raw.imageUrl;
  if (raw.fotoUrl && !clean.fotoUrl && allowedKeys.includes('fotoUrl')) clean.fotoUrl = raw.fotoUrl;

  return clean;
}

export function createResourceRouter<T, F = unknown>(options: ResourceRouterOptions<T, F>): Router {
  const { model, select, label, singularLabel, key, transform } = options;
  const map = transform ?? ((item: T) => item);
  const router = Router();

  const notFoundError = (): AppError =>
    new AppError('NOT_FOUND', `${singularLabel} no encontrado`, 404);

  const getModel = (): ResourceController<T> => {
    return typeof (options.model as any) === 'function' ? (options.model as any)() : options.model;
  };

  // 1. GET / - Listar recursos
  router.get('/', async (_req: Request, res: Response) => {
    const currentModel = getModel();
    try {
      if (currentModel && typeof currentModel.findMany === 'function') {
        const items = await currentModel.findMany({ select });
        if (items && items.length > 0) {
          res.json(AppResponse.success(items.map(map)));
          return;
        }
      }
    } catch (dbErr) {
      console.warn(`[API] DB fetch failed for ${label}, using LocalStore data:`, (dbErr as Error).message);
    }

    // Usar LocalStore persistente (con nuevos registros + modificaciones)
    const storeItems = LocalStore.getAll(label);
    res.json(AppResponse.success(storeItems.map((item) => (transform ? transform(item as unknown as T) : item))));
  });

  // 2. GET /:key - Obtener recurso individual
  router.get('/:key', async (req: Request, res: Response) => {
    const currentModel = getModel();
    const rawKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    try {
      if (currentModel && typeof currentModel.findUnique === 'function') {
        const item: T | null = await currentModel.findUnique({ where: { [key]: rawKey }, select });
        if (item) {
          res.json(AppResponse.success(map(item)));
          return;
        }
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.warn(`[API] DB fetchUnique failed for ${singularLabel}, using LocalStore:`, (error as Error).message);
    }

    const storeItem = LocalStore.getById(label, rawKey, key);
    if (storeItem) {
      res.json(AppResponse.success(transform ? transform(storeItem as unknown as T) : storeItem));
      return;
    }

    throw notFoundError();
  });

  // 3. POST / - Crear nuevo recurso (Persistencia LocalStore + DB)
  router.post('/', async (req: Request, res: Response) => {
    const currentModel = getModel();
    const rawPayload = req.body || {};
    const allowedKeys = Object.keys(select);
    const cleanData = sanitizePayload(rawPayload, allowedKeys);

    let dbItem: any = null;
    try {
      if (typeof currentModel?.create === 'function') {
        dbItem = await currentModel.create({ data: cleanData, select });
      }
    } catch (err: unknown) {
      console.warn(`[API] DB create no disponible para ${singularLabel}, guardando en LocalStore:`, (err as Error).message);
    }

    // SIEMPRE registrar en LocalStore para garantizar que persista en el entorno
    const saved = LocalStore.create(label, dbItem ? map(dbItem) : cleanData);
    res.status(201).json(AppResponse.success(saved));
  });

  // 4. PUT /:id - Actualizar recurso existente (Persistencia LocalStore + DB)
  router.put('/:id', async (req: Request, res: Response) => {
    const currentModel = getModel();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rawPayload = req.body || {};
    const allowedKeys = Object.keys(select);
    const cleanData = sanitizePayload(rawPayload, allowedKeys);

    let dbItem: any = null;
    try {
      if (typeof currentModel?.update === 'function') {
        dbItem = await currentModel.update({
          where: { [key]: id },
          data: cleanData,
          select
        });
      }
    } catch (err: unknown) {
      console.warn(`[API] DB update no disponible para ${singularLabel}, guardando en LocalStore:`, (err as Error).message);
    }

    // SIEMPRE actualizar en LocalStore
    const updated = LocalStore.update(label, id, dbItem ? map(dbItem) : cleanData, key);
    res.json(AppResponse.success(updated));
  });

  // 5. DELETE /:id - Eliminar recurso (Persistencia LocalStore + DB)
  router.delete('/:id', async (req: Request, res: Response) => {
    const currentModel = getModel();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      if (typeof currentModel?.delete === 'function') {
        await currentModel.delete({ where: { [key]: id } });
      }
    } catch (err: unknown) {
      console.warn(`[API] DB delete no disponible para ${singularLabel}:`, (err as Error).message);
    }

    LocalStore.delete(label, id, key);
    res.json(AppResponse.success({ deleted: true, id }));
  });

  return router;
}