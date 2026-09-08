'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function RoomsPage() {
  const columns: Column[] = [
    { header: 'Cabaña / Habitación', accessor: 'name', className: 'font-semibold text-gray-900' },
    { header: 'Tipo', accessor: 'type' },
    { header: 'Capacidad', accessor: (item) => `${item.capacity || 2} personas` },
    {
      header: 'Precio / Noche (USD)',
      accessor: (item) => `$${Number(item.pricePerNightUsd || item.price || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    {
      header: 'Estado',
      accessor: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          {item.active !== false ? 'DISPONIBLE' : 'MANTENIMIENTO'}
        </span>
      )
    }
  ];

  return (
    <ResourceTable
      title="Lodge & Cabañas"
      description="Gestión de cabañas, suites andinas y capacidad de hospedaje."
      endpoint="/rooms"
      columns={columns}
      onNew={() => alert('Formulario de nueva cabaña')}
      onEdit={(item) => alert(`Editando cabaña: ${item.name}`)}
    />
  );
}
