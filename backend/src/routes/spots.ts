import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
import { FALLBACK_SPOTS } from '../lib/fallbacks.js';

export default createResourceRouter({
  model: prisma.hummingbirdSpot,
  select: {
    id: true,
    title: true,
    description: true,
    benefits: true,
    imageUrl: true,
    sortOrder: true
  },
  label: 'spots',
  singularLabel: 'Escenario',
  key: 'id',
  fallbackData: FALLBACK_SPOTS
});