import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
import { FALLBACK_ROUTES } from '../lib/fallbacks.js';
export default createResourceRouter({
    model: prisma.route,
    select: {
        id: true,
        title: true,
        difficulty: true,
        duration: true,
        price: true,
        priceUSD: true,
        showPEN: true,
        showUSD: true,
        description: true,
        startPoint: true,
        sortOrder: true
    },
    label: 'rutas',
    singularLabel: 'Ruta',
    key: 'id',
    fallbackData: FALLBACK_ROUTES
});
//# sourceMappingURL=routes.js.map