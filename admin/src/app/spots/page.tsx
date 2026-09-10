'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';

const FIELDS: FormField[] = [
  {
    name: 'title',
    label: 'Nombre del Escenario / Spot',
    type: 'text',
    required: true,
    placeholder: 'Ej. Mirador El Vuelo del Picaflor',
    colSpan: 2
  },
  {
    name: 'imageUrl',
    label: 'Fotografía del Spot / Mirador',
    type: 'image',
    help: 'Sube la foto del bebedero o mirador (se optimizará a WebP)'
  },
  {
    name: 'description',
    label: 'Descripción del Punto de Observación',
    type: 'textarea',
    rows: 3,
    placeholder: 'Describe el punto de observación, especies frecuentes, vegetación y entorno...'
  },
  {
    name: 'benefits',
    label: 'Ventajas y Características (un ítem por línea)',
    type: 'list',
    placeholder: 'Bebederos de néctar orgánico esterilizados\nBancas de madera ergonómicas para fotógrafos\nSombra natural de queñuas\nDistancia óptima de 2 metros para macrofotografía'
  }
];

export default function SpotsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    {
      header: 'Foto',
      accessor: (item) => {
        const photo = item.imageUrl || item.foto;
        return photo ? (
          <img
            src={resolveMediaUrl(photo)}
            alt={item.title || item.name}
            className="w-14 h-10 object-cover rounded-lg border border-gray-200 shadow-2xs"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-14 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-medium">
            Sin foto
          </div>
        );
      }
    },
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
        subtitle="Configura foto, miradores y puntos de fotografía ornitológica"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
