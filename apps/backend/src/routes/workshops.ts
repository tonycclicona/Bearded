import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
import { FALLBACK_WORKSHOPS } from '../lib/fallbacks.js';

export default createResourceRouter({
  model: prisma.photoWorkshop,
  select: {
    id: true,
    title: true,
    category: true,
    price: true,
    priceUSD: true,
    showPEN: true,
    showUSD: true,
    duration: true,
    description: true,
    included: true,
    featured: true,
    sortOrder: true
  },
  label: 'talleres',
  singularLabel: 'Taller',
  key: 'id',
  fallbackData: FALLBACK_WORKSHOPS
});