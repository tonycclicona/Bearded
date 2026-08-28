import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
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
    key: 'id'
});
//# sourceMappingURL=routes.js.map