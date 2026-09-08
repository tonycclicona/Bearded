import { prisma } from '../lib/prisma.js';
import { createCrudRouter, str, num, bool } from './crud.js';

export default createCrudRouter({
  model: prisma.tour,
  listPath: '/admin/tours',
  viewDir: 'tours',
  idType: 'number',
  toInput: (body) => ({
    nombre: str(body.nombre),
    slug: str(body.slug) || str(body.nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    descripcion: str(body.descripcion),
    itinerario: str(body.itinerario),
    regionRuta: str(body.regionRuta) || 'Ruta Norte',
    nivelCaminata: str(body.nivelCaminata) || 'Fácil / Fotografía',
    equipoOpticoReq: str(body.equipoOpticoReq),
    precio_adulto: num(body.precio_adulto),
    precio_adulto_usd: body.precio_adulto_usd ? num(body.precio_adulto_usd) : null,
    precio_nino: body.precio_nino ? num(body.precio_nino) : null,
    precio_nino_usd: body.precio_nino_usd ? num(body.precio_nino_usd) : null,
    showPEN: bool(body.showPEN),
    showUSD: bool(body.showUSD),
    duracion_dias: num(body.duracion_dias) || 1,
    cupos_disponibles: num(body.cupos_disponibles) || 8,
    servicios_incluidos: str(body.servicios_incluidos),
    servicios_excluidos: str(body.servicios_excluidos),
    que_llevar: str(body.que_llevar),
    activo: bool(body.activo),
    destacado: bool(body.destacado)
  })
});
