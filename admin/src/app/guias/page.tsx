'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';

const FIELDS: FormField[] = [
  {
    name: 'nombre',
    label: 'Nombre del Guía Especialista',
    type: 'text',
    required: true,
    placeholder: 'Ej. Juan Carlos Huamán',
    colSpan: 2
  },
  {
    name: 'foto',
    label: 'Fotografía del Guía (Retrato)',
    type: 'image',
    help: 'Sube la foto del perfil del guía (se convertirá a WebP)'
  },
  {
    name: 'especialidad',
    label: 'Especialidad Principal',
    type: 'text',
    required: true,
    placeholder: 'Ej. Ornitología de Bosque Nuboso y Alta Montaña'
  },
  {
    name: 'experiencia',
    label: 'Años / Trayectoria de Experiencia',
    type: 'text',
    required: true,
    placeholder: 'Ej. 12 años en Cusco y Manu'
  },
  {
    name: 'idiomas',
    label: 'Idiomas Dominados',
    type: 'text',
    required: true,
    placeholder: 'Ej. Español, Inglés, Quechua'
  },
  {
    name: 'descripcion',
    label: 'Biografía / Perfil Profesional',
    type: 'textarea',
    rows: 4,
    placeholder: 'Estudios biológicos, certificaciones oficiales de montaña y expediciones lideradas...'
  }
];

export default function GuiasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    {
      header: 'Foto',
      accessor: (item) => {
        const photo = item.foto || item.imageUrl;
        return photo ? (
          <img
            src={resolveMediaUrl(photo)}
            alt={item.nombre}
            className="w-10 h-10 object-cover rounded-full border border-gray-200 shadow-2xs"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-medium">
            Sin foto
          </div>
        );
      }
    },
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
        subtitle="Configura foto de perfil WebP y trayectoria del guía de campo"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
