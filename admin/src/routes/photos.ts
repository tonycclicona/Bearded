import { prisma } from '../lib/prisma.js';
import { uploadImage } from '../lib/upload.js';
import { processImageMiddleware } from '../lib/image.js';
import { createCrudRouter, str, num, bool, imageUrlFrom } from './crud.js';

export default createCrudRouter({
  model: prisma.photoProduct,
  listPath: '/admin/photos',
  viewDir: 'photos',
  upload: [uploadImage.single('image'), processImageMiddleware],
  toInput: (body, file) => ({
    title: str(body.title),
    slug: str(body.slug),
    price: num(body.price),
    description: str(body.description),
    imageUrl: imageUrlFrom(body.imageUrl, file),
    species: str(body.species) || null,
    location: str(body.location) || null,
    camera: str(body.camera) || null,
    resolution: str(body.resolution) || null,
    type: str(body.type) as 'AVES' | 'PAISAJE',
    featured: bool(body.featured),
    sortOrder: num(body.sortOrder)
  })
});