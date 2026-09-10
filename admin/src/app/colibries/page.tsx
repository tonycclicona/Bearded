'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import { mutateApi, resolveMediaUrl } from '@/lib/api';
import { Music } from 'lucide-react';

const FIELDS: FormField[] = [
  {
    name: 'nombreComun',
    label: 'Nombre Común de la Especie',
    type: 'text',
    required: true,
    placeholder: 'Ej. Colibrí Coludo Rufo / Bearded Mountaineer'
  },
  {
    name: 'nombreCientifico',
    label: 'Nombre Científico',
    type: 'text',
    required: true,
    placeholder: 'Ej. Oreonympha nobilis'
  },
  {
    name: 'fotoPrincipal',
    label: 'Fotografía del Colibrí (Foto Principal)',
    type: 'image',
    required: true,
    help: 'Se optimizará y convertirá automáticamente a WebP'
  },
  {
    name: 'cantoAudioUrl',
    label: 'Canto o Vocalización del Ave (Audio)',
    type: 'audio',
    help: 'Sube un archivo de audio (.mp3, .wav, .m4a) con el canto del colibrí'
  },
  {
    name: 'familia',
    label: 'Familia Taxonómica',
    type: 'text',
    required: true,
    placeholder: 'Trochilidae'
  },
  {
    name: 'estadoIUCN',
    label: 'Estado de Conservación UICN',
    type: 'select',
    options: [
      { label: 'Preocupación Menor (LC)', value: 'Preocupación Menor (LC)' },
      { label: 'Casi Amenazado (NT)', value: 'Casi Amenazado (NT)' },
      { label: 'Vulnerable (VU)', value: 'Vulnerable (VU)' },
      { label: 'En Peligro (EN)', value: 'En Peligro (EN)' },
      { label: 'En Peligro Crítico (CR)', value: 'En Peligro Crítico (CR)' }
    ]
  },
  {
    name: 'altitudMinMsnm',
    label: 'Altitud Mínima (msnm)',
    type: 'number',
    step: '50',
    placeholder: '2500'
  },
  {
    name: 'altitudMaxMsnm',
    label: 'Altitud Máxima (msnm)',
    type: 'number',
    step: '50',
    placeholder: '3800'
  },
  {
    name: 'descripcion',
    label: 'Descripción Ornitológica y Hábitos',
    type: 'textarea',
    rows: 4,
    placeholder: 'Color del plumaje, flores predilectas, hábitos territoriales y época de anidación...'
  },
  {
    name: 'endemicoPeru',
    label: 'Especie Endémica de Perú (Hábitat Exclusivo)',
    type: 'checkbox',
    help: 'Marca si solo habita en territorio de los Andes Peruanos'
  }
];

export default function ColibriesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    {
      header: 'Foto',
      accessor: (item) => {
        const photo = item.fotoPrincipal || item.imageUrl;
        return photo ? (
          <img
            src={resolveMediaUrl(photo)}
            alt={item.nombreComun}
            className="w-12 h-10 object-cover rounded-lg border border-gray-200 shadow-2xs"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-12 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-medium">
            Sin foto
          </div>
        );
      }
    },
    { header: 'Especie (Común)', accessor: 'nombreComun', className: 'font-semibold text-gray-900' },
    { header: 'Nombre Científico', accessor: 'nombreCientifico', className: 'italic text-gray-600' },
    {
      header: 'Canto / Audio',
      accessor: (item) => {
        const audio = item.cantoAudioUrl || item.audioUrl;
        return audio ? (
          <audio
            controls
            src={resolveMediaUrl(audio)}
            className="h-7 w-36 scale-90 origin-left"
          />
        ) : (
          <span className="text-[11px] text-gray-400">Sin audio</span>
        );
      }
    },
    {
      header: 'Rango Altitudinal',
      accessor: (item) => (
        item.altitudMinMsnm || item.altitudMaxMsnm ? (
          <span className="text-xs text-gray-600 font-mono">
            {item.altitudMinMsnm || '0'} - {item.altitudMaxMsnm || '4000'} msnm
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      )
    },
    {
      header: 'Estado UICN',
      accessor: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
          {item.estadoIUCN || 'Preocupación Menor'}
        </span>
      )
    },
    {
      header: 'Endémico',
      accessor: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.endemicoPeru ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
          {item.endemicoPeru ? 'SÍ (PERÚ)' : 'NO'}
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
        description="Registro biológico de colibríes, avifauna andina, cantos grabados y conservación del Santuario."
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
        subtitle="Registra datos ornitológicos, fotos WebP y audios del canto del ave"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
