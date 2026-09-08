'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function ExperiencesPage() {
  const columns: Column[] = [
    { header: 'Experiencia', accessor: 'title', className: 'font-semibold text-gray-900' },
    { header: 'Duración', accessor: 'duration' },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.priceUsd || item.price || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    { header: 'Incluye', accessor: (item) => Array.isArray(item.included) ? item.included.slice(0, 2).join(', ') : 'Guía, equipo' }
  ];

  return (
    <ResourceTable
      title="Experiencias del Lodge"
      description="Cenas andinas, fogatas astronómicas y actividades de inmersión."
      endpoint="/experiences"
      columns={columns}
      onNew={() => alert('Nueva experiencia')}
      onEdit={(item) => alert(`Editando: ${item.title}`)}
    />
  );
}
