'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';

const FIELDS: FormField[] = [
  {
    name: 'title',
    label: 'Título de la Fotografía / Obra',
    type: 'text',
    required: true,
    placeholder: 'Ej. Colibrí Picoespada en Vuelo',
    colSpan: 2
  },
  {
    name: 'imageUrl',
    label: 'Fotografía en Alta Resolución',
    type: 'image',
    required: true,
    help: 'Sube la foto original. Se convertirá y optimizará automáticamente a WebP de alta fidelidad'
  },
  {
    name: 'species',
    label: 'Especie Retratada (Nombre Científico o Común)',
    type: 'text',
    placeholder: 'Ej. Ensifera ensifera'
  },
  {
    name: 'location',
    label: 'Lugar de Captura',
    type: 'text',
    placeholder: 'Ej. Valle de Yanahuara, Cusco'
  },
  {
    name: 'price',
    label: 'Precio Fine Art (PEN S/.)',
    type: 'number',
    required: true,
    step: '0.01',
    prefix: 'S/'
  },
  {
    name: 'priceUSD',
    label: 'Precio Fine Art (USD $)',
    type: 'number',
    step: '0.01',
    prefix: '$'
  },
  {
    name: 'description',
    label: 'Ficha Técnica / Detalles de la Toma',
    type: 'textarea',
    rows: 3,
    placeholder: 'Cámara, lente, velocidad de obturación, apertura focal, iluminación natural...'
  }
];

export default function PhotosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    {
      header: 'Foto',
      accessor: (item) => (
        item.imageUrl ? (
          <img
            src={resolveMediaUrl(item.imageUrl)}
            alt={item.title}
            className="w-14 h-10 object-cover rounded-lg border border-gray-200 shadow-2xs"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-14 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-medium">
            Sin foto
          </div>
        )
      )
    },
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
        description="Impresiones fine art, postales y fotografías de colección ornitológica."
        endpoint="/photos"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Fotografía' : 'Nueva Fotografía Fine Art'}
        subtitle="Sube la foto original y configura tarifas de venta fine art"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
