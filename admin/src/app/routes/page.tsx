'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';

const FIELDS: FormField[] = [
  {
    name: 'title',
    label: 'Nombre de la Ruta / Sendero',
    type: 'text',
    required: true,
    placeholder: 'Ej. Sendero Bosque de Polylepis',
    colSpan: 2
  },
  {
    name: 'imageUrl',
    label: 'Fotografía Panorámica del Sendero',
    type: 'image',
    help: 'Sube una foto del sendero o paisaje (se optimizará a WebP)'
  },
  {
    name: 'difficulty',
    label: 'Nivel de Dificultad',
    type: 'select',
    required: true,
    options: [
      { label: 'Fácil (Apto para todo público)', value: 'FACIL' },
      { label: 'Moderado (Caminata ligera)', value: 'MODERADO' },
      { label: 'Difícil (Pendientes pronunciadas)', value: 'DIFICIL' }
    ]
  },
  {
    name: 'duration',
    label: 'Duración Estimada',
    type: 'text',
    required: true,
    placeholder: 'Ej. 3 horas / 5 km'
  },
  {
    name: 'startPoint',
    label: 'Punto de Partida',
    type: 'text',
    required: true,
    placeholder: 'Ej. Jardín Principal del Lodge'
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
    label: 'Descripción del Recorrido',
    type: 'textarea',
    rows: 3,
    placeholder: 'Describe el hábitat, vegetación nativa, altitud y especies de aves observables...'
  }
];

export default function RoutesPage() {
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
        description="Senderos de observación ornitológica, expediciones botánicas y vistas panorámicas."
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
        subtitle="Configura foto panorámica, itinerario, dificultad y precio"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
