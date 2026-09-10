'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'customerName', label: 'Nombre del Cliente', type: 'text', required: true },
  { name: 'customerEmail', label: 'Email', type: 'text', required: true },
  { name: 'customerPhone', label: 'Teléfono', type: 'text' },
  {
    name: 'status',
    label: 'Estado de la Orden',
    type: 'select',
    required: true,
    options: [
      { label: 'Pendiente', value: 'pending' },
      { label: 'Completado', value: 'completed' },
      { label: 'Cancelado', value: 'cancelled' }
    ]
  }
];

export default function OrdersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
          {item.status || 'COMPLETADO'}
        </span>
      )
    }
  ];

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (data: Record<string, any>) => {
    if (editingItem?.id) {
      await mutateApi(`/checkout/${editingItem.id}`, { method: 'PUT', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Órdenes de Compra"
        description="Historial de compras de impresiones, postales y paquetes fotográficos."
        endpoint="/checkout"
        columns={columns}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Detalles de la Orden de Compra"
        subtitle="Gestiona el estado de entrega y cobro"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
