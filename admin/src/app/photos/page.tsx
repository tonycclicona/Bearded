'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function PhotosPage() {
  const columns: Column[] = [
    { header: 'Título / Obra', accessor: 'title', className: 'font-semibold text-gray-900' },
    { header: 'Categoría', accessor: 'category' },
    { header: 'Fotógrafo', accessor: 'photographer' },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.price || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    }
  ];

  return (
    <ResourceTable
      title="Galería & Productos Fotográficos"
      description="Impresiones fine art, postales y fotografías de colección."
      endpoint="/photos"
      columns={columns}
      onNew={() => alert('Subir nueva foto')}
      onEdit={(item) => alert(`Editando: ${item.title}`)}
    />
  );
}
