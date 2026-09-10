'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'name', label: 'Nombre de la Cabaña / Habitación', type: 'text', required: true, placeholder: 'Ej. Suite Colibrí Gigante' },
  { name: 'capacity', label: 'Capacidad de Personas', type: 'number', required: true, step: '1', help: 'Número máximo de huéspedes' },
  { name: 'pricePerNight', label: 'Precio por Noche (PEN)', type: 'number', required: true, step: '1', prefix: 'S/' },
  { name: 'pricePerNightUSD', label: 'Precio por Noche (USD)', type: 'number', required: true, step: '1', prefix: '$' },
  { name: 'imageUrl', label: 'URL de Imagen Principal', type: 'text', placeholder: 'https://ejemplo.com/cabana.jpg' },
  { name: 'amenities', label: 'Comodidades y Servicios', type: 'list', placeholder: 'Cama King Size\nVista al Valle Sagrado\nCalefacción ecológica\nDesayuno incluido' },
  { name: 'featured', label: 'Cabaña Destacada', type: 'checkbox', help: 'Mostrar en la portada del sitio web' }
];

export default function RoomsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    { header: 'Cabaña / Habitación', accessor: 'name', className: 'font-semibold text-gray-900' },
    { header: 'Capacidad', accessor: (item) => `${item.capacity || 2} personas` },
    {
      header: 'Precio (PEN)',
      accessor: (item) => `S/ ${Number(item.pricePerNight || item.price || 0).toFixed(2)}`,
      className: 'font-semibold text-gray-900'
    },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.pricePerNightUSD || item.priceUSD || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    {
      header: 'Estado',
      accessor: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          DISPONIBLE
        </span>
      )
    }
  ];

  const handleNew = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (data: Record<string, any>) => {
    if (editingItem?.id) {
      await mutateApi(`/rooms/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/rooms', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Lodge & Cabañas"
        description="Gestión de cabañas, suites andinas y capacidad de hospedaje."
        endpoint="/rooms"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Cabaña / Habitación' : 'Nueva Cabaña / Habitación'}
        subtitle="Configura la capacidad, tarifas por noche y comodidades"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
