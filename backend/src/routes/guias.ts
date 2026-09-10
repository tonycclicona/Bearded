import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { LocalStore } from '../lib/store.js';

const router = Router();

// GET /api/guias
router.get('/', async (_req: Request, res: Response, _next: NextFunction) => {
  try {
    const guias = await prisma.guia.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        especialidad: true,
        experiencia: true,
        idiomas: true,
        foto: true,
        descripcion: true,
        activo: true,
        orden: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        orden: 'asc'
      }
    });

    if (guias && guias.length > 0) {
      res.json(AppResponse.success(guias));
      return;
    }
  } catch (error) {
    console.warn('[API] guias findMany failed, serving LocalStore:', (error as Error).message);
  }

  const items = LocalStore.getAll('guias');
  res.json(AppResponse.success(items));
});

// GET /api/guias/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (!isNaN(id)) {
    try {
      const guia = await prisma.guia.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          especialidad: true,
          experiencia: true,
          idiomas: true,
          foto: true,
          descripcion: true,
          activo: true,
          orden: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (guia) {
        res.json(AppResponse.success(guia));
        return;
      }
    } catch (dbErr) {
      console.warn('[API] guias findUnique failed, checking LocalStore:', (dbErr as Error).message);
    }
  }

  const fallback = LocalStore.getById('guias', rawId, 'id') || LocalStore.getById('guias', rawId, 'nombre');
  if (fallback) {
    res.json(AppResponse.success(fallback));
    return;
  }

  next(new AppError('NOT_FOUND', 'Guía no encontrado', 404));
});

// POST /api/guias - Crear guía (LocalStore + DB)
router.post('/', async (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (payload.orden !== undefined) payload.orden = Number(payload.orden) || 0;
  if (payload.imageUrl && !payload.foto) payload.foto = payload.imageUrl;
  if (payload.foto && !payload.imageUrl) payload.imageUrl = payload.foto;

  let dbCreated: any = null;
  try {
    dbCreated = await prisma.guia.create({ data: payload });
  } catch (error) {
    console.warn('[API] prisma.guia.create failed, saving in LocalStore:', (error as Error).message);
  }

  const saved = LocalStore.create('guias', dbCreated || payload);
  res.status(201).json(AppResponse.success(saved));
});

// PUT /api/guias/:id - Actualizar guía (LocalStore + DB)
router.put('/:id', async (req: Request, res: Response) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const payload = { ...req.body };
  if (payload.orden !== undefined) payload.orden = Number(payload.orden) || 0;
  if (payload.imageUrl && !payload.foto) payload.foto = payload.imageUrl;
  if (payload.foto && !payload.imageUrl) payload.imageUrl = payload.foto;

  let dbUpdated: any = null;
  if (!isNaN(id)) {
    try {
      dbUpdated = await prisma.guia.update({ where: { id }, data: payload });
    } catch (error) {
      console.warn('[API] prisma.guia.update failed, updating in LocalStore:', (error as Error).message);
    }
  }

  const updated = LocalStore.update('guias', !isNaN(id) ? id : rawId, dbUpdated || payload);
  res.json(AppResponse.success(updated));
});

// DELETE /api/guias/:id - Eliminar guía (LocalStore + DB)
router.delete('/:id', async (req: Request, res: Response) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (!isNaN(id)) {
    try {
      await prisma.guia.delete({ where: { id } });
    } catch (error) {
      console.warn('[API] prisma.guia.delete failed:', (error as Error).message);
    }
  }

  LocalStore.delete('guias', !isNaN(id) ? id : rawId);
  res.json(AppResponse.success({ deleted: true, id: rawId }));
});

export default router;
