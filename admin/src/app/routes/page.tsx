'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'title', label: 'Nombre de la Ruta / Sendero', type: 'text', required: true, placeholder: 'Ej. Sendero Bosque de Polylepis' },
  {
    name: 'difficulty',
    label: 'Nivel de Dificultad',
    type: 'select',
    required: true,
    options: [
      { label: 'Fácil', value: 'FACIL' },
      { label: 'Moderado', value: 'MODERADO' },
      { label: 'Difícil', value: 'DIFICIL' }
    ]
  },
  { name: 'duration', label: 'Duración Estimada', type: 'text', required: true, placeholder: 'Ej. 3 horas / 5 km' },
  { name: 'startPoint', label: 'Punto de Partida', type: 'text', required: true, placeholder: 'Ej. Jardín Principal del Lodge' },
  { name: 'price', label: 'Tarifa en Soles (PEN)', type: 'number', required: true, step: '1', prefix: 'S/' },
  { name: 'priceUSD', label: 'Tarifa en Dólares (USD)', type: 'number', step: '1', prefix: '$' },
  { name: 'description', label: 'Descripción de la Ruta', type: 'textarea', placeholder: 'Describe el hábitat, altitud y aves observables...' }
];

export default function RoutesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    {
      header: 'Nombre de la Ruta',
      accessor: (item) => item.title || item.name || 'Sin nombre',
      className: 'font-semibold text-gray-900'
    },
    { header: 'Dificultad', accessor: 'difficulty' },
    { header: 'Duración', accessor: 'duration' },
    { header: 'Punto de Inicio', accessor: 'startPoint' },
    {
      header: 'Precio (PEN)',
      accessor: (item) => `S/ ${Number(item.price || 0).toFixed(2)}`,
      className: 'font-semibold text-gray-900'
    },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.priceUSD || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
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
      await mutateApi(`/routes/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/routes', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Rutas de Aves & Senderismo"
        description="Senderos de observación ornitológica y expediciones botánicas."
        endpoint="/routes"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Ruta Ornitológica' : 'Nueva Ruta Ornitológica'}
        subtitle="Configura el itinerario, dificultad y precio"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
