'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'primaryName', label: 'Nombre del Titular', type: 'text', required: true },
  { name: 'primaryEmail', label: 'Email', type: 'text', required: true },
  { name: 'primaryPhone', label: 'Teléfono', type: 'text' },
  {
    name: 'status',
    label: 'Estado de la Reserva',
    type: 'select',
    required: true,
    options: [
      { label: 'Pendiente de Pago', value: 'PENDIENTE_PAGO' },
      { label: 'Comprobante Enviado', value: 'COMPROBANTE_ENVIADO' },
      { label: 'Confirmada', value: 'CONFIRMADA' },
      { label: 'Cancelada', value: 'CANCELADA' }
    ]
  },
  { name: 'notes', label: 'Notas / Observaciones', type: 'textarea' }
];

export default function BookingsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (data: Record<string, any>) => {
    if (editingItem?.id) {
      await mutateApi(`/bookings/${editingItem.id}`, { method: 'PUT', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Reservas del Lodge"
        description="Historial y gestión de reservas de pases, habitaciones y actividades."
        endpoint="/bookings"
        columns={columns}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Detalles y Estado de la Reserva"
        subtitle="Actualiza el estado de confirmación o añade notas del huésped"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
