'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function WorkshopsPage() {
  const columns: Column[] = [
    { header: 'Taller / Workshop', accessor: 'title', className: 'font-semibold text-gray-900' },
    { header: 'Nivel', accessor: 'level' },
    { header: 'Instructor', accessor: 'instructor' },
    { header: 'Duración', accessor: 'duration' },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.priceUsd || item.price || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    }
  ];

  return (
    <ResourceTable
      title="Talleres de Fotografía de Naturaleza"
      description="Workshops especializados en alta velocidad y macrofotografía andina."
      endpoint="/workshops"
      columns={columns}
      onNew={() => alert('Nuevo taller')}
      onEdit={(item) => alert(`Editando: ${item.title}`)}
    />
  );
}
