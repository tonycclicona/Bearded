'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';

const FIELDS: FormField[] = [
  {
    name: 'name',
    label: 'Nombre de la Cabaña / Habitación',
    type: 'text',
    required: true,
    placeholder: 'Ej. Suite Panorámica Colibrí',
    colSpan: 2
  },
  {
    name: 'imageUrl',
    label: 'Foto Principal (Portada)',
    type: 'image',
    required: true,
    help: 'Se optimizará y convertirá automáticamente a WebP'
  },
  {
    name: 'gallery',
    label: 'Galería de Fotos Adicionales (Vistas, balcón, baño, interiores)',
    type: 'gallery',
    help: 'Puedes subir múltiples fotos simultáneamente'
  },
  {
    name: 'pricePerNight',
    label: 'Precio por Noche (PEN S/.)',
    type: 'number',
    required: true,
    step: '0.01',
    prefix: 'S/'
  },
  {
    name: 'pricePerNightUSD',
    label: 'Precio por Noche (USD $)',
    type: 'number',
    required: true,
    step: '0.01',
    prefix: '$'
  },
  {
    name: 'capacity',
    label: 'Capacidad (Personas)',
    type: 'number',
    required: true,
    step: '1',
    help: 'Número máximo de huéspedes'
  },
  {
    name: 'sortOrder',
    label: 'Orden de Prioridad',
    type: 'number',
    step: '1',
    help: '0 para mostrar primero en la lista'
  },
  {
    name: 'amenities',
    label: 'Amenidades y Servicios (un ítem por línea)',
    type: 'list',
    placeholder: 'Cama King Size con plumón térmico\nBalcón privado con vista a los bebederos\nAgua caliente y calefacción ecológica\nDesayuno orgánico incluido'
  },
  {
    name: 'featured',
    label: 'Destacar en portada del sitio web',
    type: 'checkbox',
    help: 'Aparecerá en la sección principal del lodge'
  }
];

export default function RoomsPage() {
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
            alt={item.name}
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
      header: 'Galería',
      accessor: (item) => {
        const count = Array.isArray(item.gallery)
          ? item.gallery.length
          : (typeof item.gallery === 'string' && item.gallery ? item.gallery.split(',').length : 0);
        return count > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
            {count} fotos
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">-</span>
        );
      }
    },
    {
      header: 'Destacado',
      accessor: (item) => (
        item.featured ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            ★ PORTADA
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">Normal</span>
        )
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
        description="Gestión de cabañas, suites andinas, galerías de fotos y tarifas duales (PEN/USD)."
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
        subtitle="Configura la foto de portada, galería WebP, tarifas por noche y comodidades"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
