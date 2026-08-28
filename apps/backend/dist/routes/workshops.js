import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
export default createResourceRouter({
    model: prisma.photoWorkshop,
    select: {
        id: true,
        title: true,
        category: true,
        price: true,
        duration: true,
        description: true,
        included: true,
        featured: true,
        sortOrder: true
    },
    label: 'talleres',
    singularLabel: 'Taller',
    key: 'id'
});
//# sourceMappingURL=workshops.js.map