import { prisma } from '../lib/prisma.js';
import { createCrudRouter, str, num, bool } from './crud.js';

export default createCrudRouter({
  model: prisma.route,
  listPath: '/admin/routes',
  viewDir: 'routes',
  toInput: (body) => ({
    title: str(body.title),
    difficulty: str(body.difficulty) as 'FACIL' | 'MODERADO' | 'DIFICIL',
    duration: str(body.duration),
    price: num(body.price),
    priceUSD: body.priceUSD ? num(body.priceUSD) : null,
    showPEN: bool(body.showPEN),
    showUSD: bool(body.showUSD),
    description: str(body.description),
    startPoint: str(body.startPoint),
    sortOrder: num(body.sortOrder)
  })
});