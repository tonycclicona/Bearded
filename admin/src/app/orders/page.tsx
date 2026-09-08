'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function OrdersPage() {
  const columns: Column[] = [
    { header: 'Orden ID', accessor: (item) => String(item.id || '').slice(0, 8), className: 'font-mono text-gray-500' },
    { header: 'Cliente', accessor: 'customerName', className: 'font-semibold text-gray-900' },
    { header: 'Email', accessor: 'customerEmail' },
    { header: 'Fecha', accessor: (item) => new Date(item.createdAt || Date.now()).toLocaleDateString('es-PE') },
    {
      header: 'Monto Total',
      accessor: (item) => `$${Number(item.totalAmount || item.total || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    {
      header: 'Estado',
      accessor: (item) => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          {item.status || 'COMPLETADO'}
        </span>
      )
    }
  ];

  return (
    <ResourceTable
      title="Órdenes de Compra"
      description="Historial de compras de impresiones, postales y paquetes fotográficos."
      endpoint="/checkout"
      columns={columns}
    />
  );
}
