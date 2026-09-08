import { prisma } from '../lib/prisma.js';
import { createCrudRouter, str, num, bool, lineArray } from './crud.js';

export default createCrudRouter({
  model: prisma.photoWorkshop,
  listPath: '/admin/workshops',
  viewDir: 'workshops',
  toInput: (body) => ({
    title: str(body.title),
    category: str(body.category) as 'NATURALEZA' | 'AVES' | 'PAISAJES' | 'OTROS',
    price: num(body.price),
    duration: str(body.duration),
    description: str(body.description),
    included: lineArray(body.included),
    featured: bool(body.featured),
    sortOrder: num(body.sortOrder)
  })
});