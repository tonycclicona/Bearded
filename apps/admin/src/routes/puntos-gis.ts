import { prisma } from '../lib/prisma.js';
import { uploadImage } from '../lib/upload.js';
import { processImageMiddleware } from '../lib/image.js';
import { createCrudRouter, str, num, bool, imageUrlFrom } from './crud.js';

export default createCrudRouter({
  model: prisma.puntoGIS,
  listPath: '/admin/puntos-gis',
  viewDir: 'puntos-gis',
  idType: 'number',
  upload: [uploadImage.single('image'), processImageMiddleware],
  toInput: (body, file) => ({
    nombre: str(body.nombre),
    slug: str(body.slug) || str(body.nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    categoria: str(body.categoria),
    departamento: str(body.departamento),
    latitud: num(body.latitud),
    longitud: num(body.longitud),
    altitudMsnm: num(body.altitudMsnm),
    mejorTemporada: str(body.mejorTemporada),
    acceso: str(body.acceso),
    descripcion: str(body.descripcion),
    fotoUrl: imageUrlFrom(body.fotoUrl, file),
    activo: bool(body.activo)
  })
});
