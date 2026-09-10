import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
import { FALLBACK_PHOTOS } from '../lib/fallbacks.js';
import type { PhotoType } from '../types/index.js';

type PhotoRow = {
  id: string;
  title: string;
  slug: string;
  price: number;
  description: string;
  imageUrl: string;
  species: string | null;
  location: string | null;
  camera: string | null;
  resolution: string | null;
  type: PhotoType;
  featured: boolean;
  sortOrder: number;
};

function mapPhoto(photo: PhotoRow) {
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

const fallbackPhotoRows: PhotoRow[] = FALLBACK_PHOTOS.map((p) => ({
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

export default createResourceRouter<PhotoRow>({
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