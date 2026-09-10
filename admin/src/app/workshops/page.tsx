'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'title', label: 'Título del Taller / Workshop', type: 'text', required: true, placeholder: 'Ej. Masterclass Alta Velocidad con Colibríes' },
  {
    name: 'category',
    label: 'Categoría',
    type: 'select',
    required: true,
    options: [
      { label: 'Aves & Colibríes', value: 'AVES' },
      { label: 'Naturaleza', value: 'NATURALEZA' },
      { label: 'Paisajes', value: 'PAISAJES' },
      { label: 'Otros', value: 'OTROS' }
    ]
  },
  { name: 'duration', label: 'Duración', type: 'text', required: true, placeholder: 'Ej. 2 días / 12 horas' },
  { name: 'price', label: 'Tarifa en Soles (PEN)', type: 'number', required: true, step: '1', prefix: 'S/' },
  { name: 'priceUSD', label: 'Tarifa en Dólares (USD)', type: 'number', step: '1', prefix: '$' },
  { name: 'description', label: 'Descripción del Taller', type: 'textarea', placeholder: 'Temario, técnicas fotográficas a enseñar...' },
  { name: 'included', label: 'Material e Inclusiones', type: 'list', placeholder: 'Acceso a flashes de alta velocidad\nAsesoría personalizada\nCertificado digital' }
];

export default function WorkshopsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    { header: 'Taller / Workshop', accessor: 'title', className: 'font-semibold text-gray-900' },
    { header: 'Categoría', accessor: 'category' },
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
      await mutateApi(`/workshops/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/workshops', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Talleres de Fotografía de Naturaleza"
        description="Workshops especializados en alta velocidad y macrofotografía andina."
        endpoint="/workshops"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Taller Fotográfico' : 'Nuevo Taller Fotográfico'}
        subtitle="Configura precios, categoría e inclusiones"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
