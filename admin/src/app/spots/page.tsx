'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function SpotsPage() {
  const columns: Column[] = [
    { header: 'Escenario / Spot', accessor: 'name', className: 'font-semibold text-gray-900' },
    { header: 'Ubicación', accessor: 'location' },
    { header: 'Altitud', accessor: (item) => `${item.altitude || '3,200'} msnm` },
    { header: 'Mejor Horario', accessor: 'bestTime' }
  ];

  return (
    <ResourceTable
      title="Escenarios & Spots de Avistamiento"
      description="Puntos de observación y bebederos de colibríes en el santuario."
      endpoint="/hummingbird-spots"
      columns={columns}
      onNew={() => alert('Nuevo spot')}
      onEdit={(item) => alert(`Editando: ${item.name}`)}
    />
  );
}
