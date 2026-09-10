'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';

const FIELDS: FormField[] = [
  {
    name: 'title',
    label: 'Nombre de la Experiencia',
    type: 'text',
    required: true,
    placeholder: 'Ej. Fogata Andina & Astronomía Inca',
    colSpan: 2
  },
  {
    name: 'imageUrl',
    label: 'Foto de Portada de la Experiencia',
    type: 'image',
    help: 'Sube la foto promocional (se optimizará a WebP)'
  },
  {
    name: 'duration',
    label: 'Duración',
    type: 'text',
    required: true,
    placeholder: 'Ej. 2 horas / 1 noche'
  },
  {
    name: 'price',
    label: 'Tarifa en Soles (PEN S/.)',
    type: 'number',
    required: true,
    step: '0.01',
    prefix: 'S/'
  },
  {
    name: 'priceUSD',
    label: 'Tarifa en Dólares (USD $)',
    type: 'number',
    step: '0.01',
    prefix: '$'
  },
  {
    name: 'description',
    label: 'Descripción de la Experiencia',
    type: 'textarea',
    rows: 3,
    placeholder: 'Describe los momentos de la actividad, rituales, ambiente y recomendaciones...'
  },
  {
    name: 'included',
    label: 'Servicios Incluidos (un ítem por línea)',
    type: 'list',
    placeholder: 'Guía ornitólogo bilingüe\nBebidas calientes y snacks orgánicos\nTelescopio astronómico\nFogata comunal'
  }
];

export default function ExperiencesPage() {
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
            alt={item.title}
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
        subtitle="Configura foto de portada, tarifas e inclusiones de la actividad"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
