import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
export default createResourceRouter({
    model: prisma.room,
    select: {
        id: true,
        name: true,
        pricePerNight: true,
        pricePerNightUSD: true,
        showPEN: true,
        showUSD: true,
        capacity: true,
        amenities: true,
        imageUrl: true,
        gallery: true,
        featured: true,
        sortOrder: true
    },
    label: 'habitaciones',
    singularLabel: 'Habitación',
    key: 'id'
});
//# sourceMappingURL=rooms.js.map