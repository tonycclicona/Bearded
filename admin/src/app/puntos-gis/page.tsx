'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import CrudModal, { FormField } from '@/components/CrudModal';
import GisMap, { GisPoint } from '@/components/GisMap';
import { mutateApi, resolveMediaUrl } from '@/lib/api';
import { Map, Layers, Compass, Plus } from 'lucide-react';

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
    name: 'gisPicker',
    label: 'Localizador Satelital & OpenStreetMap (Arrastra el marcador)',
    type: 'gis_picker',
    latField: 'latitud',
    lngField: 'longitud',
    help: 'Arrastra el marcador 📍 o haz clic en cualquier lugar del mapa para mover el punto en el espacio. Las coordenadas se actualizarán en tiempo real.',
    colSpan: 2
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
    name: 'categoria',
    label: 'Categoría del Punto',
    type: 'select',
    required: true,
    options: [
      { label: 'Hotspot Bebedero / Comedero', value: 'HOTSPOT_COMEDERO' },
      { label: 'Observatorio Silvestre', value: 'OBSERVATORIO_SILVESTRE' },
      { label: 'Hábitat Especie Endémica', value: 'ESPECIE_ENDEMICA' },
      { label: 'Refugio / Campamento', value: 'CAMPAMENTO_REFUGIO' },
      { label: 'Punto de Encuentro Logístico', value: 'LOGISTICA_PUNTO_ENCUENTRO' }
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
    name: 'fotoUrl',
    label: 'Fotografía del Spot / Hito Geográfico',
    type: 'image',
    help: 'Foto de referencia del mirador o punto (se convertirá automáticamente a WebP optimizado)'
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
  const [allPoints, setAllPoints] = useState<GisPoint[]>([]);
  const [showMapOverview, setShowMapOverview] = useState(true);

  const columns: Column[] = [
    {
      header: 'Foto',
      accessor: (item) => {
        const photo = item.fotoUrl || item.imageUrl || item.foto;
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
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          {item.categoria?.replace(/_/g, ' ') || 'Punto GIS'}
        </span>
      )
    },
    {
      header: 'Coordenadas (Lat, Lng)',
      accessor: (item) => (
        <span className="font-mono text-xs text-gray-700 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
          {Number(item.latitud || 0).toFixed(5)}, {Number(item.longitud || 0).toFixed(5)}
        </span>
      )
    },
    { header: 'Región', accessor: (item) => item.departamento || 'Cusco' },
    { header: 'Altitud', accessor: (item) => `${item.altitudMsnm || item.altitud || 2800} msnm` }
  ];

  const handleNew = () => {
    setEditingItem({
      latitud: -13.315,
      longitud: -72.155,
      departamento: 'Cusco',
      altitudMsnm: 2870,
      categoria: 'HOTSPOT_COMEDERO',
      fotoUrl: ''
    });
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem({
      ...item,
      fotoUrl: item.fotoUrl || item.imageUrl || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (data: Record<string, any>) => {
    const payload = {
      ...data,
      imageUrl: data.fotoUrl || data.imageUrl || '',
      fotoUrl: data.fotoUrl || data.imageUrl || ''
    };

    if (editingItem?.id) {
      await mutateApi(`/puntos-gis/${editingItem.id}`, { method: 'PUT', body: payload });
    } else {
      await mutateApi('/puntos-gis', { method: 'POST', body: payload });
    }
    setRefreshKey((prev) => prev + 1);
  };

  const handlePointsLoaded = (items: any[]) => {
    const valid = items
      .filter((it) => it && typeof it.latitud === 'number' && typeof it.longitud === 'number')
      .map((it) => ({
        id: it.id,
        nombre: it.nombre,
        latitud: it.latitud,
        longitud: it.longitud,
        categoria: it.categoria,
        altitudMsnm: it.altitudMsnm,
        imageUrl: it.fotoUrl || it.imageUrl,
        departamento: it.departamento,
        descripcion: it.descripcion
      }));
    setAllPoints(valid);
  };

  return (
    <div className="space-y-6">
      {/* Barra de estado GIS y controles de vista */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-[#10352b] rounded-xl border border-emerald-100">
              <Compass className="w-5 h-5 text-[#10352b]" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">
                Plataforma GIS & Georreferenciación Satelital
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Visualización espacial en OpenStreetMap con coordenadas satelitales y editor dinámico
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setShowMapOverview(!showMapOverview)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showMapOverview
                ? 'bg-gray-100 text-gray-800 border-gray-300'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
            }`}
          >
            <Map className="w-4 h-4 text-[#10352b]" />
            <span>{showMapOverview ? 'Ocultar Mapa' : 'Mostrar Mapa'}</span>
          </button>

          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-[#10352b] hover:bg-[#0a231c] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-[#c29b38]" />
            Nuevo Punto GIS
          </button>
        </div>
      </div>

      {/* Mapa interactivo general con OpenStreetMap y Esri Satélite */}
      {showMapOverview && (
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Mapa General de Puntos Monitoreados ({allPoints.length} hitos registrados)
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">
              💡 Haz clic en cualquier marcador para ver detalles y editar el punto
            </span>
          </div>

          <GisMap
            mode="overview"
            height="440px"
            points={allPoints}
            onSelectPoint={(p) => {
              const fullItem = allPoints.find((x) => x.id === p.id) || p;
              handleEdit(fullItem);
            }}
          />
        </div>
      )}

      {/* Tabla de Puntos GIS */}
      <ResourceTable
        title=""
        description=""
        endpoint="/puntos-gis"
        columns={columns}
        onNew={handleNew}
        onEdit={handleEdit}
        refreshKey={refreshKey}
        onDataLoaded={handlePointsLoaded}
      />

      {/* Modal con GisMap Picker interactivo */}
      <CrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem?.id ? 'Editar Punto GIS' : 'Nuevo Punto Georreferenciado'}
        subtitle="Mueve el marcador directamente sobre el mapa de OpenStreetMap para ajustar las coordenadas en tiempo real"
        fields={FIELDS}
        initialData={editingItem}
        onSave={handleSave}
      />
    </div>
  );
}
