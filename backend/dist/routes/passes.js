import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
import { FALLBACK_PASSES } from '../lib/fallbacks.js';
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
    label: 'passes',
    singularLabel: 'Pase',
    key: 'id',
    fallbackData: FALLBACK_PASSES
});
//# sourceMappingURL=passes.js.map