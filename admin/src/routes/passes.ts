import { prisma } from '../lib/prisma.js';
import { createCrudRouter, str, num, bool, lineArray } from './crud.js';

export default createCrudRouter({
  model: prisma.hummingbirdPass,
  listPath: '/admin/passes',
  viewDir: 'passes',
  toInput: (body) => ({
    title: str(body.title),
    price: num(body.price),
    priceUSD: body.priceUSD ? num(body.priceUSD) : null,
    showPEN: bool(body.showPEN),
    showUSD: bool(body.showUSD),
    description: str(body.description),
    features: lineArray(body.features),
    featured: bool(body.featured),
    sortOrder: num(body.sortOrder)
  })
});