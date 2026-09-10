'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'title', label: 'Título de la Fotografía / Obra', type: 'text', required: true, placeholder: 'Ej. Colibrí Picoespada en Vuelo' },
  { name: 'slug', label: 'Identificador URL (slug)', type: 'text', required: true, placeholder: 'ej. colibri-picoespada-vuelo' },
  { name: 'species', label: 'Especie Retratada', type: 'text', placeholder: 'Ej. Ensifera ensifera' },
  { name: 'location', label: 'Lugar de Captura', type: 'text', placeholder: 'Ej. Valle de Yanahuara, Cusco' },
  { name: 'imageUrl', label: 'URL de la Fotografía', type: 'text', required: true, placeholder: 'https://ejemplo.com/foto.jpg' },
  { name: 'price', label: 'Precio en Soles (PEN)', type: 'number', required: true, step: '1', prefix: 'S/' },
  { name: 'priceUSD', label: 'Precio en Dólares (USD)', type: 'number', step: '1', prefix: '$' },
  { name: 'description', label: 'Descripción / Ficha Técnica', type: 'textarea', placeholder: 'Cámara, lente, velocidad de obturación...' }
];

export default function PhotosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    { header: 'Título / Obra', accessor: 'title', className: 'font-semibold text-gray-900' },
    { header: 'Especie', accessor: (item) => item.species || 'N/A' },
    { header: 'Ubicación', accessor: (item) => item.location || 'Cusco' },
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
      await mutateApi(`/photos/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/photos', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Galería & Productos Fotográficos"
        description="Impresiones fine art, postales y fotografías de colección."
        endpoint="/photos"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Fotografía' : 'Nueva Fotografía'}
        subtitle="Configura los metadatos y tarifas de impresión fine art"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
