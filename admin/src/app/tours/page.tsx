'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function ToursPage() {
  const columns: Column[] = [
    { header: 'Tour Guiado', accessor: 'nombre', className: 'font-semibold text-gray-900' },
    { header: 'Duración', accessor: 'duracion' },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.precioUsd || item.precio || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    { header: 'Dificultad', accessor: 'dificultad' }
  ];

  return (
    <ResourceTable
      title="Tours & Expediciones"
      description="Itinerarios programados y expediciones para ornitólogos y ecoturistas."
      endpoint="/tours"
      columns={columns}
      onNew={() => alert('Nuevo tour')}
      onEdit={(item) => alert(`Editando: ${item.nombre}`)}
    />
  );
}
