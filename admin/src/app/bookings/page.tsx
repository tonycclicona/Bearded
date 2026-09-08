'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function BookingsPage() {
  const columns: Column[] = [
    { header: 'ID', accessor: (item) => String(item.id || '').slice(0, 8), className: 'font-mono text-gray-500' },
    { header: 'Titular', accessor: (item) => item.primaryName || item.customerName || 'Cliente', className: 'font-semibold text-gray-900' },
    { header: 'Email', accessor: (item) => item.primaryEmail || item.customerEmail || '-' },
    { header: 'Teléfono', accessor: (item) => item.primaryPhone || item.customerPhone || '-' },
    { header: 'Fecha', accessor: (item) => new Date(item.createdAt || item.date || Date.now()).toLocaleDateString('es-PE') },
    {
      header: 'Total',
      accessor: (item) => `${item.currency || 'USD'} ${Number(item.totalAmount || item.unitPrice || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    {
      header: 'Estado',
      accessor: (item) => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          {item.status || 'CONFIRMADO'}
        </span>
      )
    }
  ];

  return (
    <ResourceTable
      title="Reservas del Lodge"
      description="Historial y gestión de reservas de pases, habitaciones y actividades."
      endpoint="/bookings"
      columns={columns}
      onEdit={(item) => alert(`Detalles de reserva: ${item.primaryName || item.customerName}`)}
    />
  );
}
