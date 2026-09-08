'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function PassesPage() {
  const columns: Column[] = [
    { header: 'Nombre', accessor: 'name', className: 'font-semibold text-gray-900' },
    { header: 'Tipo', accessor: 'type' },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.priceUsd || item.price || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    {
      header: 'Precio (PEN)',
      accessor: (item) => `S/ ${Number(item.pricePen || 0).toFixed(2)}`
    },
    {
      header: 'Estado',
      accessor: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          {item.active !== false ? 'ACTIVO' : 'INACTIVO'}
        </span>
      )
    }
  ];

  return (
    <ResourceTable
      title="Pases de Observación de Colibríes"
      description="Gestión de pases de acceso, tarifas y categorías de visitantes."
      endpoint="/passes"
      columns={columns}
      onNew={() => alert('Para agregar o editar un pase, utiliza la API o el modal de creación.')}
      onEdit={(item) => alert(`Editando pase: ${item.name}`)}
    />
  );
}
