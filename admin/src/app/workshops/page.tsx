'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';

const FIELDS: FormField[] = [
  {
    name: 'title',
    label: 'Título del Taller / Workshop',
    type: 'text',
    required: true,
    placeholder: 'Ej. Masterclass Alta Velocidad con Colibríes',
    colSpan: 2
  },
  {
    name: 'imageUrl',
    label: 'Foto de Portada del Workshop',
    type: 'image',
    help: 'Sube la foto promocional del taller (se optimizará a WebP)'
  },
  {
    name: 'category',
    label: 'Categoría',
    type: 'select',
    required: true,
    options: [
      { label: 'Aves & Colibríes', value: 'AVES' },
      { label: 'Naturaleza & Paisajes', value: 'NATURALEZA' },
      { label: 'Macrofotografía', value: 'MACRO' },
      { label: 'Alta Velocidad', value: 'ALTA_VELOCIDAD' }
    ]
  },
  {
    name: 'duration',
    label: 'Duración',
    type: 'text',
    required: true,
    placeholder: 'Ej. 2 días / 12 horas'
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
    label: 'Descripción del Taller',
    type: 'textarea',
    rows: 3,
    placeholder: 'Temario, técnicas fotográficas a enseñar, nivel requerido...'
  },
  {
    name: 'included',
    label: 'Material e Inclusiones (un ítem por línea)',
    type: 'list',
    placeholder: 'Acceso a flashes de alta velocidad multifoco\nAsesoría personalizada de campo\nAlmuerzo orgánico campestre\nCertificado digital'
  }
];

export default function WorkshopsPage() {
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
        subtitle="Configura foto promocional, tarifas e inclusiones"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
