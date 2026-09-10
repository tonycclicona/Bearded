'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'nombreComun', label: 'Nombre Común', type: 'text', required: true, placeholder: 'Ej. Colibrí Coludo Rufo' },
  { name: 'nombreCientifico', label: 'Nombre Científico', type: 'text', required: true, placeholder: 'Ej. Metallura tyrianthina' },
  { name: 'familia', label: 'Familia', type: 'text', required: true, placeholder: 'Trochilidae' },
  { name: 'estadoIUCN', label: 'Estado de Conservación IUCN', type: 'text', placeholder: 'Preocupación Menor (LC) o En Peligro (EN)' },
  { name: 'altitudMinMsnm', label: 'Altitud Mínima (msnm)', type: 'number', step: '50', placeholder: '1500' },
  { name: 'altitudMaxMsnm', label: 'Altitud Máxima (msnm)', type: 'number', step: '50', placeholder: '3600' },
  { name: 'fotoPrincipal', label: 'URL de Fotografía', type: 'text', required: true, placeholder: 'https://ejemplo.com/colibri.jpg' },
  { name: 'descripcion', label: 'Descripción Ornitológica', type: 'textarea', placeholder: 'Color del plumaje, hábitos de alimentación y patrones de cortejo...' },
  { name: 'endemicoPeru', label: 'Especie Endémica de Perú', type: 'checkbox', help: 'Marcar si solo habita en territorio peruano' }
];

export default function ColibriesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    { header: 'Especie (Común)', accessor: 'nombreComun', className: 'font-semibold text-gray-900' },
    { header: 'Nombre Científico', accessor: 'nombreCientifico', className: 'italic text-gray-600' },
    { header: 'Familia', accessor: 'familia' },
    {
      header: 'Estado Conservación',
      accessor: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
          {item.estadoIUCN || 'Preocupación Menor'}
        </span>
      )
    },
    {
      header: 'Endémico',
      accessor: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.endemicoPeru ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
          {item.endemicoPeru ? 'SÍ' : 'NO'}
        </span>
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
      await mutateApi(`/colibries/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/colibries', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Catálogo Taxonómico de Colibríes"
        description="Registro biológico de colibríes y avifauna del Santuario Bearded Mountaineer."
        endpoint="/colibries"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Especie de Colibrí' : 'Nueva Especie de Colibrí'}
        subtitle="Registra datos científicos y taxonómicos de la especie"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
