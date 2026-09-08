'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function PuntosGisPage() {
  const columns: Column[] = [
    { header: 'Punto / Hito', accessor: 'nombre', className: 'font-semibold text-gray-900' },
    { header: 'Tipo', accessor: 'tipo' },
    { header: 'Latitud', accessor: (item) => Number(item.latitud || 0).toFixed(5) },
    { header: 'Longitud', accessor: (item) => Number(item.longitud || 0).toFixed(5) },
    { header: 'Altitud (msnm)', accessor: 'altitud' }
  ];

  return (
    <ResourceTable
      title="Plataforma GIS & Georreferenciación"
      description="Puntos de control, miradores y nidos monitoreados con coordenadas satelitales."
      endpoint="/puntos-gis"
      columns={columns}
      onNew={() => alert('Nuevo punto GIS')}
      onEdit={(item) => alert(`Editando: ${item.nombre}`)}
    />
  );
}
