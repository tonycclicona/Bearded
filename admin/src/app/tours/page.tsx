'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';

const FIELDS: FormField[] = [
  {
    name: 'nombre',
    label: 'Nombre del Tour / Expedición',
    type: 'text',
    required: true,
    placeholder: 'Ej. Expedición Endémicas del Manu & Cusco',
    colSpan: 2
  },
  {
    name: 'imageUrl',
    label: 'Foto de Portada de la Expedición',
    type: 'image',
    required: true,
    help: 'Se optimizará y convertirá automáticamente a WebP'
  },
  {
    name: 'regionRuta',
    label: 'Región de la Ruta',
    type: 'select',
    required: true,
    options: [
      { label: 'Ruta Sur Manu', value: 'Ruta Sur Manu' },
      { label: 'Ruta Norte', value: 'Ruta Norte' },
      { label: 'Ruta Centro', value: 'Ruta Centro' },
      { label: 'Valle Sagrado', value: 'Valle Sagrado' }
    ]
  },
  {
    name: 'duracion_dias',
    label: 'Duración (Días)',
    type: 'number',
    required: true,
    step: '1',
    placeholder: '4'
  },
  {
    name: 'cupos_disponibles',
    label: 'Cupos Disponibles',
    type: 'number',
    required: true,
    step: '1',
    placeholder: '8'
  },
  {
    name: 'precio_adulto',
    label: 'Precio por Adulto (PEN S/.)',
    type: 'number',
    required: true,
    step: '0.01',
    prefix: 'S/'
  },
  {
    name: 'precio_adulto_usd',
    label: 'Precio por Adulto (USD $)',
    type: 'number',
    step: '0.01',
    prefix: '$'
  },
  {
    name: 'nivelCaminata',
    label: 'Nivel de Exigencia',
    type: 'select',
    options: [
      { label: 'Fácil / Familiar', value: 'Fácil' },
      { label: 'Fotografía / Paso Lento', value: 'Fotografía' },
      { label: 'Moderado', value: 'Moderado' },
      { label: 'Exigente / Alta Montaña', value: 'Exigente' }
    ]
  },
  {
    name: 'descripcion',
    label: 'Descripción del Itinerario y Objetivos',
    type: 'textarea',
    rows: 4,
    placeholder: 'Resumen del viaje, puntos de avistamiento clave y especies objetivo...'
  }
];

export default function ToursPage() {
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
            alt={item.nombre}
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
    { header: 'Tour Guiado', accessor: 'nombre', className: 'font-semibold text-gray-900' },
    { header: 'Región', accessor: 'regionRuta' },
    { header: 'Duración', accessor: (item) => `${item.duracion_dias || 1} días` },
    {
      header: 'Precio (PEN)',
      accessor: (item) => `S/ ${Number(item.precio_adulto || 0).toFixed(2)}`,
      className: 'font-semibold text-gray-900'
    },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.precio_adulto_usd || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    { header: 'Cupos', accessor: (item) => `${item.cupos_disponibles || 0} disponibles` }
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
      await mutateApi(`/tours/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/tours', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Tours & Expediciones"
        description="Itinerarios programados y expediciones ornitológicas con fotos de portada."
        endpoint="/tours"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Tour de Expedición' : 'Nuevo Tour de Expedición'}
        subtitle="Configura foto de portada, itinerario, región y precios de la expedición"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
