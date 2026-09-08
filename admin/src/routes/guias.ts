import { prisma } from '../lib/prisma.js';
import { uploadImage } from '../lib/upload.js';
import { processImageMiddleware } from '../lib/image.js';
import { createCrudRouter, str, num, bool, imageUrlFrom } from './crud.js';

export default createCrudRouter({
  model: prisma.guia,
  listPath: '/admin/guias',
  viewDir: 'guias',
  idType: 'number',
  upload: [uploadImage.single('image'), processImageMiddleware],
  toInput: (body, file) => ({
    nombre: str(body.nombre),
    especialidad: str(body.especialidad),
    experiencia: str(body.experiencia),
    idiomas: str(body.idiomas),
    foto: imageUrlFrom(body.foto, file),
    descripcion: str(body.descripcion),
    activo: bool(body.activo),
    orden: num(body.orden)
  })
});
