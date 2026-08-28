import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppResponse } from '@antigravity/shared/utils/response';
import { AppError } from '@antigravity/shared/utils/errors';

const router = Router();

// GET /api/puntos-gis
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoria, departamento, piso } = req.query;

    const where: Record<string, unknown> = { activo: true };

    if (categoria && typeof categoria === 'string' && categoria !== 'TODOS') {
      where.categoria = categoria;
    }

    if (departamento && typeof departamento === 'string') {
      where.departamento = { contains: departamento, mode: 'insensitive' };
    }

    if (piso && typeof piso === 'string') {
      if (piso === 'YUNGA') {
        where.altitudMsnm = { gte: 500, lte: 2300 };
      } else if (piso === 'QUECHUA') {
        where.altitudMsnm = { gt: 2300, lte: 3500 };
      } else if (piso === 'SUNI_PUNA') {
        where.altitudMsnm = { gt: 3500 };
      }
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
        especies: {
          select: {
            id: true,
            nombreComun: true,
            nombreCientifico: true,
            estadoIUCN: true,
            endemicoPeru: true,
            fotoPrincipal: true,
            audioCantoUrl: true
          }
        },
        toursAsociados: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            descripcion: true,
            itinerario: true,
            regionRuta: true,
            nivelCaminata: true,
            equipoOpticoReq: true,
            precio_adulto: true,
            precio_adulto_usd: true,
            precio_nino: true,
            precio_nino_usd: true,
            showPEN: true,
            showUSD: true,
            duracion_dias: true,
            cupos_disponibles: true,
            servicios_incluidos: true,
            servicios_excluidos: true,
            que_llevar: true,
            activo: true,
            destacado: true,
            imagenes: {
              select: {
                id: true,
                url: true,
                esPortada: true
              }
            }
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    const parsed = puntos.map((p) => ({
      ...p,
      latitud: Number(p.latitud),
      longitud: Number(p.longitud)
    }));

    res.json(AppResponse.success(parsed));
  } catch (error) {
    next(error instanceof AppError ? error : new AppError('FETCH_ERROR', 'Error al obtener puntos GIS', 500));
  }
});

// GET /api/puntos-gis/:slug
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

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
        especies: {
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
            audioCantoUrl: true
          }
        },
        toursAsociados: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            descripcion: true,
            itinerario: true,
            regionRuta: true,
            nivelCaminata: true,
            equipoOpticoReq: true,
            precio_adulto: true,
            precio_adulto_usd: true,
            precio_nino: true,
            precio_nino_usd: true,
            showPEN: true,
            showUSD: true,
            duracion_dias: true,
            cupos_disponibles: true,
            servicios_incluidos: true,
            servicios_excluidos: true,
            que_llevar: true,
            activo: true,
            destacado: true,
            imagenes: {
              select: {
                id: true,
                url: true,
                esPortada: true
              }
            }
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    if (!punto) {
      throw new AppError('NOT_FOUND', 'Punto GIS no encontrado', 404);
    }

    res.json(
      AppResponse.success({
        ...punto,
        latitud: Number(punto.latitud),
        longitud: Number(punto.longitud)
      })
    );
  } catch (error) {
    next(error instanceof AppError ? error : new AppError('FETCH_ERROR', 'Error al obtener punto GIS', 500));
  }
});

export default router;
