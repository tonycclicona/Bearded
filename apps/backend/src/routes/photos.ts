import { prisma } from '../lib/prisma.js';
import { createResourceRouter } from '../lib/resource-router.js';
import type { PhotoType } from '@antigravity/shared';

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
  label: 'fotos',
  singularLabel: 'Foto',
  key: 'slug',
  transform: mapPhoto
});