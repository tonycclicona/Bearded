'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'nombre', label: 'Nombre del Punto / Hito GIS', type: 'text', required: true, placeholder: 'Ej. Mirador Valle Sagrado - Sector Norte' },
  { name: 'slug', label: 'Identificador URL (slug)', type: 'text', required: true, placeholder: 'mirador-valle-sagrado-norte' },
  {
    name: 'categoria',
    label: 'Categoría',
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
  { name: 'departamento', label: 'Departamento / Región', type: 'text', required: true, placeholder: 'Cusco' },
  { name: 'latitud', label: 'Latitud GPS', type: 'number', required: true, step: '0.000001', placeholder: '-13.315000' },
  { name: 'longitud', label: 'Longitud GPS', type: 'number', required: true, step: '0.000001', placeholder: '-72.155000' },
  { name: 'altitudMsnm', label: 'Altitud (msnm)', type: 'number', step: '10', placeholder: '2870' },
  { name: 'mejorTemporada', label: 'Mejor Temporada', type: 'text', placeholder: 'Todo el año / Mayo - Octubre' },
  { name: 'descripcion', label: 'Descripción del Punto', type: 'textarea', placeholder: 'Punto estratégico de avistamiento temprano...' }
];

export default function PuntosGisPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    { header: 'Punto / Hito', accessor: 'nombre', className: 'font-semibold text-gray-900' },
    { header: 'Categoría', accessor: 'categoria' },
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
        description="Puntos de control, miradores y nidos monitoreados con coordenadas satelitales."
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
        subtitle="Configura coordenadas GPS y parámetros del hito geográfico"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
