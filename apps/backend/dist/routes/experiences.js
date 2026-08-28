import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
export default createResourceRouter({
    model: prisma.lodgeExperience,
    select: {
        id: true,
        title: true,
        price: true,
        priceUSD: true,
        showPEN: true,
        showUSD: true,
        duration: true,
        description: true,
        included: true,
        imageUrl: true,
        sortOrder: true
    },
    label: 'experiencias',
    singularLabel: 'Experiencia',
    key: 'id'
});
//# sourceMappingURL=experiences.js.map