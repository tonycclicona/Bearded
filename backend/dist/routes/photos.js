import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
import { FALLBACK_PHOTOS } from '../lib/fallbacks.js';
function mapPhoto(photo) {
    return {
        id: photo.id,
        title: photo.title,
        slug: photo.slug,
        price: photo.price,
        description: photo.description,
        imageUrl: photo.imageUrl,
        type: photo.type,
        featured: photo.featured,
        sortOrder: photo.sortOrder,
        metadata: {
            species: photo.species ?? undefined,
            location: photo.location ?? undefined,
            camera: photo.camera ?? undefined,
            resolution: photo.resolution ?? undefined,
        },
    };
}
const fallbackPhotoRows = FALLBACK_PHOTOS.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: p.price,
    description: p.description,
    imageUrl: p.imageUrl,
    species: p.metadata?.species ?? null,
    location: p.metadata?.location ?? null,
    camera: p.metadata?.camera ?? null,
    resolution: p.metadata?.resolution ?? null,
    type: p.type,
    featured: p.featured,
    sortOrder: p.sortOrder,
}));
export default createResourceRouter({
    model: prisma.photoProduct,
    select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        description: true,
        imageUrl: true,
        species: true,
        location: true,
        camera: true,
        resolution: true,
        type: true,
        featured: true,
        sortOrder: true
    },
    label: 'photos',
    singularLabel: 'Foto',
    key: 'slug',
    transform: mapPhoto,
    fallbackData: fallbackPhotoRows
});
//# sourceMappingURL=photos.js.map