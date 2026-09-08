'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function RoutesPage() {
  const columns: Column[] = [
    { header: 'Nombre de la Ruta', accessor: 'name', className: 'font-semibold text-gray-900' },
    { header: 'Dificultad', accessor: 'difficulty' },
    { header: 'Distancia', accessor: (item) => `${item.distanceKm || item.distance || '5'} km` },
    { header: 'Duración', accessor: (item) => `${item.durationHours || '3'} hrs` },
    { header: 'Aves Clave', accessor: (item) => Array.isArray(item.keySpecies) ? item.keySpecies.slice(0, 2).join(', ') : 'Ensifera Ensifera' }
  ];

  return (
    <ResourceTable
      title="Rutas de Aves & Senderismo"
      description="Senderos de observación ornitológica y expediciones botánicas."
      endpoint="/routes"
      columns={columns}
      onNew={() => alert('Nueva ruta')}
      onEdit={(item) => alert(`Editando ruta: ${item.name}`)}
    />
  );
}
