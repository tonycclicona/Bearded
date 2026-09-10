'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'title', label: 'Nombre del Escenario / Spot', type: 'text', required: true, placeholder: 'Ej. Mirador El Vuelo del Picaflor' },
  { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Describe el punto de observación, vegetación y entorno...' },
  { name: 'benefits', label: 'Ventajas y Características', type: 'list', placeholder: 'Bebederos de néctar orgánico\nBancas de madera ergonómicas\nSombra natural' },
  { name: 'imageUrl', label: 'URL de Foto / Imagen', type: 'text', placeholder: 'https://ejemplo.com/spot.jpg' }
];

export default function SpotsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    {
      header: 'Escenario / Spot',
      accessor: (item) => item.title || item.name || 'Sin título',
      className: 'font-semibold text-gray-900'
    },
    {
      header: 'Descripción',
      accessor: (item) => (
        <div className="text-gray-500 text-xs line-clamp-1 max-w-sm">
          {item.description || 'Sin descripción'}
        </div>
      )
    },
    {
      header: 'Beneficios',
      accessor: (item) => Array.isArray(item.benefits) ? item.benefits.slice(0, 2).join(', ') : 'Observación'
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
      await mutateApi(`/hummingbird-spots/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/hummingbird-spots', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Escenarios & Spots de Avistamiento"
        description="Puntos de observación y bebederos de colibríes en el santuario."
        endpoint="/hummingbird-spots"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Escenario / Spot' : 'Nuevo Escenario / Spot'}
        subtitle="Configura los miradores y puntos de fotografía"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
