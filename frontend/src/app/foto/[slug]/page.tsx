import { Suspense } from 'react';
import PhotoDetailClient from './PhotoDetailClient';
import { PHOTO_SLUGS } from './slugs';

// Pre-renderiza todas las páginas de fotos en build time
export function generateStaticParams() {
  return [
    ...PHOTO_SLUGS.map((slug) => ({ slug })),
    { slug: 'checkout-success' },
  ];
}

export default function PhotoDetailPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    }>
      <PhotoDetailClient slug={params.slug} />
    </Suspense>
  );
}
