'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';

const FIELDS: FormField[] = [
  {
    name: 'nombre',
    label: 'Nombre del Punto / Hito GIS',
    type: 'text',
    required: true,
    placeholder: 'Ej. Mirador Valle Sagrado - Sector Norte',
    colSpan: 2
  },
  {
    name: 'imageUrl',
    label: 'Fotografía del Spot / Hito Geográfico',
    type: 'image',
    help: 'Sube una foto del punto o mirador (se optimizará a WebP)'
  },
  {
    name: 'categoria',
    label: 'Categoría del Punto',
    type: 'select',
    required: true,
    options: [
      { label: 'Hotspot Bebedero', value: 'HOTSPOT_COMEDERO' },
      { label: 'Observatorio Silvestre', value: 'OBSERVATORIO_SILVESTRE' },
      { label: 'Hábitat Especie Endémica', value: 'ESPECIE_ENDEMICA' },
      { label: 'Refugio / Campamento', value: 'CAMPAMENTO_REFUGIO' },
      { label: 'Punto de Encuentro', value: 'LOGISTICA_PUNTO_ENCUENTRO' }
    ]
  },
  {
    name: 'departamento',
    label: 'Departamento / Región',
    type: 'text',
    required: true,
    placeholder: 'Cusco'
  },
  {
    name: 'latitud',
    label: 'Latitud GPS (Decimal)',
    type: 'number',
    required: true,
    step: '0.000001',
    placeholder: '-13.315000'
  },
  {
    name: 'longitud',
    label: 'Longitud GPS (Decimal)',
    type: 'number',
    required: true,
    step: '0.000001',
    placeholder: '-72.155000'
  },
  {
    name: 'altitudMsnm',
    label: 'Altitud (msnm)',
    type: 'number',
    step: '10',
    placeholder: '2870'
  },
  {
    name: 'mejorTemporada',
    label: 'Mejor Temporada de Visita',
    type: 'text',
    placeholder: 'Todo el año / Mayo - Octubre'
  },
  {
    name: 'descripcion',
    label: 'Descripción Detallada del Punto',
    type: 'textarea',
    rows: 3,
    placeholder: 'Punto estratégico de avistamiento temprano con vista despejada a los árboles de queñua...'
  }
];

export default function PuntosGisPage() {
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
            className="w-12 h-9 object-cover rounded-lg border border-gray-200 shadow-2xs"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-12 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-medium">
            Sin foto
          </div>
        );
      }
    },
    { header: 'Punto / Hito', accessor: 'nombre', className: 'font-semibold text-gray-900' },
    {
      header: 'Categoría',
      accessor: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
          {item.categoria?.replace(/_/g, ' ') || 'Punto GIS'}
        </span>
      )
    },
    { header: 'Latitud', accessor: (item) => Number(item.latitud || 0).toFixed(5) },
    { header: 'Longitud', accessor: (item) => Number(item.longitud || 0).toFixed(5) },
    { header: 'Altitud', accessor: (item) => `${item.altitudMsnm || item.altitud || 2800} msnm` }
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
      await mutateApi(`/puntos-gis/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/puntos-gis', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Plataforma GIS & Georreferenciación"
        description="Puntos de control, miradores y nidos monitoreados con coordenadas satelitales y fotos."
        endpoint="/puntos-gis"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Punto GIS' : 'Nuevo Punto Georreferenciado'}
        subtitle="Configura coordenadas GPS, fotos y parámetros del hito geográfico"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
