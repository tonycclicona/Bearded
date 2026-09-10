'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi } from '@/lib/api';

const FIELDS: FormField[] = [
  { name: 'nombre', label: 'Nombre del Guía Especialista', type: 'text', required: true, placeholder: 'Ej. Juan Carlos Huamán' },
  { name: 'especialidad', label: 'Especialidad', type: 'text', required: true, placeholder: 'Ej. Ornitología de Bosque Nuboso y Alta Montaña' },
  { name: 'experiencia', label: 'Años de Experiencia', type: 'text', required: true, placeholder: 'Ej. 12 años en Cusco y Manu' },
  { name: 'idiomas', label: 'Idiomas', type: 'text', required: true, placeholder: 'Ej. Español, Inglés, Quechua' },
  { name: 'foto', label: 'URL de Fotografía', type: 'text', placeholder: 'https://ejemplo.com/guia.jpg' },
  { name: 'descripcion', label: 'Biografía / Perfil Profesional', type: 'textarea', placeholder: 'Estudios, certificaciones y expediciones lideradas...' }
];

export default function GuiasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    { header: 'Guía Especialista', accessor: 'nombre', className: 'font-semibold text-gray-900' },
    { header: 'Especialidad', accessor: 'especialidad' },
    { header: 'Idiomas', accessor: 'idiomas' },
    { header: 'Experiencia', accessor: 'experiencia' }
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
      await mutateApi(`/guias/${editingItem.id}`, { method: 'PUT', body: data });
    } else {
      await mutateApi('/guias', { method: 'POST', body: data });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ResourceTable
        title="Guías de Campo & Especialistas"
        description="Biólogos, ornitólogos locales y fotógrafos de naturaleza de expedición."
        endpoint="/guias"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Guía Especialista' : 'Nuevo Guía Especialista'}
        subtitle="Configura el perfil profesional del guía de campo"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
