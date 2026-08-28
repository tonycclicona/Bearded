import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
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
    label: 'escenarios',
    singularLabel: 'Escenario',
    key: 'id'
});
//# sourceMappingURL=spots.js.map