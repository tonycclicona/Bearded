'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'title', label: 'Nombre de la Experiencia', type: 'text', required: true, placeholder: 'Ej. Fogata Andina & Astronomía Inca' },
  { name: 'duration', label: 'Duración', type: 'text', required: true, placeholder: 'Ej. 2 horas' },
  { name: 'price', label: 'Tarifa en Soles (PEN)', type: 'number', required: true, step: '1', prefix: 'S/' },
  { name: 'priceUSD', label: 'Tarifa en Dólares (USD)', type: 'number', step: '1', prefix: '$' },
  { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Describe los momentos de la experiencia...' },
  { name: 'included', label: 'Servicios Incluidos', type: 'list', placeholder: 'Guía bilingüe\nBebidas calientes y snacks\nTelescopio' }
];

export default function ExperiencesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    { header: 'Experiencia', accessor: 'title', className: 'font-semibold text-gray-900' },
    { header: 'Duración', accessor: 'duration' },
    {
      header: 'Precio (PEN)',
      accessor: (item) => `S/ ${Number(item.price || 0).toFixed(2)}`,
      className: 'font-semibold text-gray-900'
    },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.priceUSD || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    {
      header: 'Incluye',
      accessor: (item) => Array.isArray(item.included) ? item.included.slice(0, 2).join(', ') : 'Servicios incluidos'
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
      await mutateApi(`/experiences/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/experiences', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Experiencias del Lodge"
        description="Cenas andinas, fogatas astronómicas y actividades de inmersión."
        endpoint="/experiences"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Experiencia' : 'Nueva Experiencia'}
        subtitle="Configura los detalles de la actividad"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
