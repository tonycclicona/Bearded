import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';

export default createResourceRouter({
  model: prisma.hummingbirdPass,
  select: {
    id: true,
    title: true,
    price: true,
    priceUSD: true,
    showPEN: true,
    showUSD: true,
    description: true,
    features: true,
    featured: true,
    sortOrder: true
  },
  label: 'pases',
  singularLabel: 'Pase',
  key: 'id'
});