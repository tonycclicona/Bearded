'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function ColibriesPage() {
  const columns: Column[] = [
    { header: 'Especie (Común)', accessor: 'nombreComun', className: 'font-semibold text-gray-900' },
    { header: 'Nombre Científico', accessor: 'nombreCientifico', className: 'italic text-gray-600' },
    { header: 'Familia', accessor: 'familia' },
    { header: 'Hábitat', accessor: 'habitat' },
    {
      header: 'Estado Conservación',
      accessor: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
          {item.estadoConservacion || 'LC'}
        </span>
      )
    }
  ];

  return (
    <ResourceTable
      title="Catálogo Taxonómico de Colibríes"
      description="Registro biológico de colibríes y avifauna del Santuario Bearded Mountaineer."
      endpoint="/colibries"
      columns={columns}
      onNew={() => alert('Nuevo colibrí')}
      onEdit={(item) => alert(`Editando: ${item.nombreComun}`)}
    />
  );
}
