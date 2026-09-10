'use client';

import { useState, useEffect } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import MediaUpload from '@/components/MediaUpload';
import { fetcher, mutateApi, resolveMediaUrl } from '@/lib/api';
import { FileText, Video, Save, CheckCircle, Sparkles, Loader2 } from 'lucide-react';

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
    name: 'videoUrl',
    label: 'Video o Animación WebP del Colibrí (Opcional)',
    type: 'video',
    help: 'Sube un clip de video (.mp4, .webm) o animación WebP de esta especie'
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

  // Estado de configuración del Catálogo (Brochure PDF & Video)
  const [catalogSettings, setCatalogSettings] = useState({
    pdfUrl: '',
    videoUrl: '',
    title: 'Catálogo Oficial de Aves del Santuario',
    description: 'Descarga nuestro catálogo ornitológico oficial en PDF con la taxonomía y avifauna del Valle Sagrado.'
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Cargar configuración de catálogo
  useEffect(() => {
    let mounted = true;
    setLoadingSettings(true);
    fetcher('/colibries/catalog-settings')
      .then((data: any) => {
        if (mounted && data) {
          setCatalogSettings((prev) => ({
            ...prev,
            ...data
          }));
        }
      })
      .catch((err: unknown) => {
        console.warn('Error cargando catalog-settings:', err);
      })
      .finally(() => {
        if (mounted) setLoadingSettings(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await mutateApi('/colibries/catalog-settings', {
        method: 'PUT',
        body: catalogSettings
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar configuración del catálogo');
    } finally {
      setSavingSettings(false);
    }
  };

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
      header: 'Video / Clip',
      accessor: (item) => {
        return item.videoUrl ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Video className="w-3 h-3 text-amber-600" /> WebP / Video
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
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
      {/* 1. MÓDULO DE RECURSOS DEL CATÁLOGO (PDF DESCARGABLE Y VIDEO WEBP) */}
      <div className="mb-8 bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#c29b38] flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Recursos del Catálogo en Frontend
            </span>
            <h3 className="text-base font-bold text-gray-900">
              Catálogo Oficial en PDF y Video Promocional
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
              El archivo PDF subido aquí se descargará desde la <strong>burbuja flotante</strong> en la esquina superior derecha del catálogo del sitio web. El video o animación WebP complementará la experiencia multimedia.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {settingsSaved && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-in fade-in">
                <CheckCircle className="w-4 h-4" /> Guardado
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings || loadingSettings}
              className="bg-[#10352b] hover:bg-[#0c2a22] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#c29b38]" />
                  <span>Guardar Catálogo</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Subida de PDF */}
          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <MediaUpload
              label="Catálogo Oficial en PDF (Descargable por visitantes)"
              mode="pdf"
              value={catalogSettings.pdfUrl}
              onChange={(val) => setCatalogSettings((prev) => ({ ...prev, pdfUrl: val }))}
              help="Este es el archivo PDF que los usuarios descargarán con un clic en la burbuja de la esquina superior derecha de la sección Catálogo."
            />
          </div>

          {/* Subida de Video / Animación WebP */}
          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <MediaUpload
              label="Video / Animación WebP del Catálogo"
              mode="video"
              value={catalogSettings.videoUrl}
              onChange={(val) => setCatalogSettings((prev) => ({ ...prev, videoUrl: val }))}
              help="Sube un video promocional (.mp4, .webm) o clip animado WebP para la sección del catálogo."
            />
          </div>
        </div>
      </div>

      {/* 2. TABLA DE GESTIÓN DE ESPECIES TAXONÓMICAS */}
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
        subtitle="Registra datos ornitológicos, fotos WebP, videos y audios del canto del ave"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </>
  );
}
