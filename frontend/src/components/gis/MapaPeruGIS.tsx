'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { ContentService, resolveImageUrl } from '@/services/content.service';
import type { PuntoGIS, EspecieColibri, PisoEcologico, CategoriaPuntoGIS, Tour } from '@/types';
import { openWhatsApp } from '@/lib/whatsapp';
import { useBookingStore } from '@/store/useBookingStore';
import {
  MapPin,
  Layers,
  Compass,
  Volume2,
  VolumeX,
  X,
  ExternalLink,
  Search,
  CheckCircle2,
  Calendar,
  Mountain,
  Footprints,
  Sparkles,
  Bird,
  Play,
  Pause,
  Clock,
  Shield,
  Check,
  AlertCircle,
  Users,
  Camera
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic import with SSR disabled for Leaflet
const MapaLeafletCore = dynamic(() => import('./MapaLeafletCore'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] bg-primary/10 border border-border-custom rounded-2xl flex flex-col items-center justify-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
      <p className="text-xs font-semibold text-primary/70">Cargando Capas GIS de Perú...</p>
    </div>
  )
});

type MacroRuta = 'TODAS' | 'NORTE' | 'CENTRO' | 'SUR';

const REGION_CENTERS: Record<MacroRuta, { center: [number, number]; zoom: number; label: string; desc: string }> = {
  TODAS: {
    center: [-9.19, -75.015],
    zoom: 6,
    label: 'Todo el Perú',
    desc: 'Visión panorámica de las 3 Macro-Rutas ornitológicas.'
  },
  NORTE: {
    center: [-5.95, -77.95],
    zoom: 8,
    label: 'Ruta Norte (Amazonas / San Martín)',
    desc: 'Hogar del Colibrí Cola de Espátula, Huembo y Abra Patricia.'
  },
  CENTRO: {
    center: [-10.2, -76.3],
    zoom: 8,
    label: 'Ruta Centro (Huánuco / Pasco / Lima)',
    desc: 'Bosque Unchog, Carpish y cañón de Santa Eulalia.'
  },
  SUR: {
    center: [-13.4, -72.0],
    zoom: 8,
    label: 'Ruta Sur (Cusco / Manu / Arequipa)',
    desc: 'Santuario de San Salvador, Manu, Abra Málaga y Machu Picchu.'
  }
};

export default function MapaPeruGIS() {
  const [selectedRuta, setSelectedRuta] = useState<MacroRuta>('TODAS');
  const [selectedPiso, setSelectedPiso] = useState<PisoEcologico>('TODOS');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPunto, setSelectedPunto] = useState<PuntoGIS | null>(null);
  const [selectedTourOverlay, setSelectedTourOverlay] = useState<Tour | null>(null);
  const { openBooking } = useBookingStore();

  // Audio player state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Nominatim Search State
  const [isSearchingNominatim, setIsSearchingNominatim] = useState(false);
  const [customCenter, setCustomCenter] = useState<[number, number] | null>(null);
  const [customZoom, setCustomZoom] = useState<number | null>(null);

  // Consultar Puntos GIS de la API
  const { data: puntos = [], isLoading } = useQuery({
    queryKey: ['puntosGIS'],
    queryFn: () => ContentService.getPuntosGIS()
  });

  // Consultar Tours de la API para vincular expediciones
  const { data: allTours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: () => ContentService.getTours()
  });

  const handleOpenExpedicion = () => {
    if (!selectedPunto) return;

    // 1. Buscar en tours asociados del punto
    if (selectedPunto.toursAsociados && selectedPunto.toursAsociados.length > 0) {
      const directTour = allTours.find((t) => t.id === selectedPunto.toursAsociados![0].id) || selectedPunto.toursAsociados[0];
      setSelectedTourOverlay(directTour as Tour);
      return;
    }

    // 2. Buscar por región geográfica o departamento
    const depto = (selectedPunto.departamento || '').toLowerCase();
    const matchedTour = allTours.find((t) => {
      const reg = (t.regionRuta || '').toLowerCase();
      if (depto.includes('cusco') || depto.includes('madre de dios') || depto.includes('puno') || depto.includes('arequipa') || depto.includes('apurímac')) {
        return reg.includes('sur') || reg.includes('manu') || reg.includes('cusco');
      }
      if (depto.includes('amazonas') || depto.includes('san martín') || depto.includes('cajamarca') || depto.includes('lambayeque')) {
        return reg.includes('norte') || reg.includes('marañón') || reg.includes('amazonas');
      }
      if (depto.includes('huánuco') || depto.includes('pasco') || depto.includes('junín') || depto.includes('lima')) {
        return reg.includes('centro') || reg.includes('carpish') || reg.includes('central');
      }
      return false;
    }) || allTours[0];

    if (matchedTour) {
      setSelectedTourOverlay(matchedTour);
    }
  };

  // Filtrado reactivo de puntos GIS
  const filteredPuntos = useMemo(() => {
    return puntos.filter((punto) => {
      // Filtro por Macro-Ruta
      if (selectedRuta === 'NORTE') {
        const depto = punto.departamento.toLowerCase();
        if (!depto.includes('amazonas') && !depto.includes('san martín') && !depto.includes('lambayeque') && !depto.includes('cajamarca')) {
          return false;
        }
      } else if (selectedRuta === 'CENTRO') {
        const depto = punto.departamento.toLowerCase();
        if (!depto.includes('huánuco') && !depto.includes('pasco') && !depto.includes('lima') && !depto.includes('junín')) {
          return false;
        }
      } else if (selectedRuta === 'SUR') {
        const depto = punto.departamento.toLowerCase();
        if (!depto.includes('cusco') && !depto.includes('madre de dios') && !depto.includes('arequipa') && !depto.includes('puno')) {
          return false;
        }
      }

      // Filtro por Piso Ecológico
      if (selectedPiso === 'YUNGA' && (punto.altitudMsnm < 500 || punto.altitudMsnm > 2300)) return false;
      if (selectedPiso === 'QUECHUA' && (punto.altitudMsnm <= 2300 || punto.altitudMsnm > 3500)) return false;
      if (selectedPiso === 'SUNI_PUNA' && punto.altitudMsnm <= 3500) return false;

      // Filtro por Categoría
      if (selectedCategoria !== 'TODOS' && punto.categoria !== selectedCategoria) return false;

      // Filtro por Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNombre = punto.nombre.toLowerCase().includes(q);
        const matchDepto = punto.departamento.toLowerCase().includes(q);
        const matchDesc = punto.descripcion.toLowerCase().includes(q);
        if (!matchNombre && !matchDepto && !matchDesc) return false;
      }

      return true;
    });
  }, [puntos, selectedRuta, selectedPiso, selectedCategoria, searchQuery]);

  // Manejo de Audio de cantos
  const handleToggleAudio = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      audioElement?.pause();
      setPlayingAudio(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        alert('No se pudo reproducir la muestra de audio en este navegador.');
      });
      audio.onended = () => setPlayingAudio(null);
      setAudioElement(audio);
      setPlayingAudio(audioUrl);
    }
  };

  // Búsqueda inversa con Nominatim OpenStreetMap
  const handleNominatimSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingNominatim(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          `${searchQuery}, Peru`
        )}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setCustomCenter([lat, lon]);
        setCustomZoom(10);
      }
    } catch {
      // fallback silencioso
    } finally {
      setIsSearchingNominatim(false);
    }
  };

  const currentCenter = customCenter || REGION_CENTERS[selectedRuta].center;
  const currentZoom = customZoom || REGION_CENTERS[selectedRuta].zoom;

  return (
    <section id="mapa-gis" className="relative py-16 md:py-24 bg-background border-b border-border-custom overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div className="max-w-3xl">
            <span className="text-accent uppercase tracking-widest text-xs font-semibold flex items-center gap-1.5 mb-2">
              <Compass className="w-4 h-4 text-accent" /> Mapa de rutas
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-primary">
              Mapa Interactivo de Hotspots & Aves
            </h2>
            <p className="text-primary/75 font-light leading-relaxed mt-2 text-sm md:text-base">
              Explora hotspots, hábitats y destinos para la observación de aves andinas y endémicas en las principales regiones ornitológicas del Perú.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-primary/60 font-semibold">
              Mostrando: <strong className="text-primary font-bold">{filteredPuntos.length}</strong> hotspots
            </span>
          </div>
        </div>

        {/* CONTROLES Y FILTROS GIS */}
        <div className="bg-bg-card border border-border-custom rounded-2xl p-4 md:p-6 shadow-sm mb-8 space-y-5">

          {/* Selector de Macro-Rutas */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-primary/70 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" /> 1. Macro-Rutas de Aves en Perú:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(REGION_CENTERS) as MacroRuta[]).map((rutaKey) => (
                <button
                  key={rutaKey}
                  onClick={() => {
                    setSelectedRuta(rutaKey);
                    setCustomCenter(null);
                    setCustomZoom(null);
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left flex flex-col border ${selectedRuta === rutaKey
                    ? 'bg-primary-solid text-white border-primary shadow-md'
                    : 'bg-background text-primary/70 border-border-custom hover:border-accent'
                    }`}
                >
                  <span className="font-bold">{REGION_CENTERS[rutaKey].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtros secundarios: Pisos Ecológicos & Categorías & Buscador */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-border-custom/60 items-center">

            {/* Pisos Ecológicos */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-primary/70 flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-secondary" /> Piso Ecológico / Altitud:
              </label>
              <select
                value={selectedPiso}
                onChange={(e) => setSelectedPiso(e.target.value as PisoEcologico)}
                className="w-full px-3 py-2 bg-background border border-border-custom rounded-lg text-xs text-primary font-medium focus:ring-2 focus:ring-accent focus:outline-none"
              >
                <option value="TODOS">Todos los Pisos (0 - 4,500+ msnm)</option>
                <option value="YUNGA">🌿 Yunga (500 – 2,300 msnm) • Ceja de Selva</option>
                <option value="QUECHUA">🌾 Quechua (2,300 – 3,500 msnm) • Valles Templados</option>
                <option value="SUNI_PUNA">🏔️ Suni / Puna (&gt;3,500 msnm) • Alta Montaña</option>
              </select>
            </div>

            {/* Categorías GIS */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-primary/70 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-accent" /> Tipo de Marcador GIS:
              </label>
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border-custom rounded-lg text-xs text-primary font-medium focus:ring-2 focus:ring-accent focus:outline-none"
              >
                <option value="TODOS">Todas las Categorías</option>
                <option value="HOTSPOT_COMEDERO">🟢 Comederos & Bebederos Botánicos</option>
                <option value="OBSERVATORIO_SILVESTRE">🔵 Observatorios & Bosque Nuboso</option>
                <option value="ESPECIE_ENDEMICA">🟣 Especies Endémicas Amenazadas</option>
                <option value="CAMPAMENTO_REFUGIO">🟠 Campamentos & Refugios</option>
                <option value="LOGISTICA_PUNTO_ENCUENTRO">🔴 Puntos de Encuentro Logístico</option>
              </select>
            </div>

            {/* Buscador y Nominatim */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-primary/70 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-primary/70" /> Buscar Lugar en Perú:
              </label>
              <form onSubmit={handleNominatimSearch} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Ej: Huembo, Manu, Cusco..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border-custom rounded-lg text-xs text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSearchingNominatim}
                  className="px-3 py-2 bg-primary-solid hover:bg-accent text-white hover:text-primary rounded-lg text-xs font-bold transition-all shrink-0"
                >
                  {isSearchingNominatim ? '...' : 'Buscar'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* CONTENEDOR DEL MAPA Y PANEL LATERAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* MAPA LEAFLET */}
          <div className="lg:col-span-8 bg-bg-card border border-border-custom rounded-2xl p-2 shadow-lg relative min-h-[540px]">
            {isLoading ? (
              <div className="h-[520px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
              </div>
            ) : (
              <MapaLeafletCore
                puntos={filteredPuntos}
                selectedPunto={selectedPunto}
                onSelectPunto={(punto) => setSelectedPunto(punto)}
                center={currentCenter}
                zoom={currentZoom}
              />
            )}

            {/* Leyenda en esquina inferior */}
            <div className="absolute bottom-5 left-5 bg-bg-card/95 backdrop-blur border border-border-custom/80 p-3 rounded-xl shadow-md z-[400] text-[10px] space-y-1 hidden sm:block">
              <span className="font-bold text-primary uppercase tracking-wider block mb-1">Leyenda GIS:</span>
              <div className="flex items-center gap-1.5 text-primary/80">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Comederos & Jardines
              </div>
              <div className="flex items-center gap-1.5 text-primary/80">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Bosque Nuboso
              </div>
              <div className="flex items-center gap-1.5 text-primary/80">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Endémicos Exclusivos
              </div>
              <div className="flex items-center gap-1.5 text-primary/80">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Refugios
              </div>
            </div>
          </div>

          {/* DRAWER / DETALLE DEL HOTSPOT SELECCIONADO */}
          <div className="lg:col-span-4 bg-bg-card border border-border-custom rounded-2xl p-5 md:p-6 shadow-lg min-h-[540px] flex flex-col justify-between">
            {selectedPunto ? (
              <div className="space-y-4 animate-in fade-in duration-300">

                {/* Cabecera del Drawer */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/20 text-accent inline-block mb-1">
                      {selectedPunto.categoria.replace('_', ' ')}
                    </span>
                    <h3 className="font-serif text-xl md:text-2xl font-bold text-primary">
                      {selectedPunto.nombre}
                    </h3>
                    <p className="text-xs text-primary/70 font-medium">
                      {selectedPunto.departamento} • <span className="font-bold text-accent">{selectedPunto.altitudMsnm} msnm</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPunto(null)}
                    className="p-1 rounded-full text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Foto del Hotspot */}
                {selectedPunto.fotoUrl && (
                  <div className="relative h-36 w-full rounded-xl overflow-hidden shadow-inner">
                    <Image
                      src={resolveImageUrl(selectedPunto.fotoUrl)}
                      alt={selectedPunto.nombre}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Datos de campo */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-background p-3 rounded-xl border border-border-custom/50">
                  <div>
                    <span className="text-primary/50 block font-semibold">Temporada Óptima:</span>
                    <span className="text-primary font-medium">{selectedPunto.mejorTemporada || 'Todo el año'}</span>
                  </div>
                  <div>
                    <span className="text-primary/50 block font-semibold">Acceso:</span>
                    <span className="text-primary font-medium">{selectedPunto.acceso || 'Sendero moderado'}</span>
                  </div>
                </div>

                {/* Descripción */}
                <p className="text-xs text-primary/80 font-light leading-relaxed">
                  {selectedPunto.descripcion}
                </p>

                {/* ESPECIES DE COLIBRÍES EN EL HOTSPOT */}
                <div className="space-y-2 pt-2 border-t border-border-custom/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Bird className="w-3.5 h-3.5 text-accent" /> Especies Destacadas en este Punto:
                  </h4>

                  {selectedPunto.especies && selectedPunto.especies.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedPunto.especies.map((esp) => (
                        <div
                          key={esp.id}
                          className="bg-background border border-border-custom/70 rounded-xl p-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5">
                            {esp.fotoPrincipal && (
                              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                <Image
                                  src={resolveImageUrl(esp.fotoPrincipal)}
                                  alt={esp.nombreComun}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-bold text-primary leading-tight">
                                {esp.nombreComun}
                              </div>
                              <div className="text-[10px] text-primary/60 italic leading-tight">
                                {esp.nombreCientifico}
                              </div>
                              {esp.endemicoPeru && (
                                <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                                  🇵🇪 Endémico
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botón de reproducción de audio */}
                          {esp.audioCantoUrl && (
                            <button
                              type="button"
                              onClick={() => handleToggleAudio(esp.audioCantoUrl!)}
                              className={`p-2 rounded-full text-xs font-bold transition-all shrink-0 ${playingAudio === esp.audioCantoUrl
                                ? 'bg-accent text-primary scale-110 shadow-md animate-pulse'
                                : 'bg-primary/10 text-primary hover:bg-accent hover:text-white'
                                }`}
                              title={playingAudio === esp.audioCantoUrl ? 'Pausar Canto' : 'Escuchar Canto'}
                            >
                              {playingAudio === esp.audioCantoUrl ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-primary/50 italic">
                      Consulta el checklist completo de aves con nuestros guías.
                    </p>
                  )}
                </div>

                {/* Botón de Acción Directa */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenExpedicion}
                    className="w-full bg-primary-solid hover:bg-accent text-white hover:text-primary py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <span>Ver Expedición Asociada</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <MapPin className="w-7 h-7 text-accent" />
                </div>
                <h4 className="font-serif text-lg font-bold text-primary">
                  Selecciona un Hotspot GIS
                </h4>
                <p className="text-xs text-primary/65 font-light leading-relaxed max-w-xs">
                  Haz clic en cualquier marcador del mapa para explorar la ficha ornitológica, escuchar el canto de los colibríes presentes y conocer las rutas asociadas.
                </p>
                <div className="pt-3 text-[11px] text-accent font-semibold">
                  💡 Tip: Puedes filtrar por macro-rutas y pisos ecológicos arriba.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL OVERLAY DE INFORMACIÓN COMPLETA DE LA EXPEDICIÓN ASOCIADA */}
      <AnimatePresence>
        {selectedTourOverlay && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
            onClick={() => setSelectedTourOverlay(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-card border border-border-custom rounded-3xl max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 relative text-primary"
            >
              {/* Botón Cerrar */}
              <button
                type="button"
                aria-label="Cerrar modal de expedición"
                onClick={() => setSelectedTourOverlay(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-primary/10 hover:bg-primary hover:text-white flex items-center justify-center transition-colors z-20 text-primary"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Cabecera del Tour */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-accent/20 text-accent inline-block">
                    {selectedTourOverlay.regionRuta}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-accent" /> {selectedTourOverlay.duracion_dias} Días
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary/15 text-secondary inline-flex items-center gap-1">
                    <Footprints className="w-3 h-3" /> {selectedTourOverlay.nivelCaminata}
                  </span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                  {selectedTourOverlay.nombre}
                </h3>

                {selectedPunto && (
                  <div className="mt-2 text-xs font-semibold text-accent flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>Punto de partida / Hotspot clave: {selectedPunto.nombre} ({selectedPunto.departamento} • {selectedPunto.altitudMsnm} msnm)</span>
                  </div>
                )}

                <p className="text-sm text-primary/80 mt-3 font-light leading-relaxed">
                  {selectedTourOverlay.descripcion}
                </p>
              </div>

              {/* Precio & Cupos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-background p-4 rounded-2xl border border-border-custom text-xs">
                <div>
                  <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Inversión por Adulto</span>
                  <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                    {(selectedTourOverlay.showPEN ?? true) && (
                      <span className="text-xl font-serif font-bold text-primary">
                        S/. {Number(selectedTourOverlay.precio_adulto).toFixed(2)} <span className="text-[10px] font-sans font-normal text-primary/60">PEN</span>
                      </span>
                    )}
                    {selectedTourOverlay.showUSD && selectedTourOverlay.precio_adulto_usd != null && (
                      <span className={`font-serif font-bold ${!(selectedTourOverlay.showPEN ?? true) ? 'text-xl text-primary' : 'text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200'}`}>
                        ${Number(selectedTourOverlay.precio_adulto_usd).toFixed(2)} <span className="text-[10px] font-sans font-normal text-emerald-700">USD</span>
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Duración Total</span>
                  <span className="text-base font-bold text-primary">
                    {selectedTourOverlay.duracion_dias} Días / {Math.max(1, selectedTourOverlay.duracion_dias - 1)} Noches
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Disponibilidad</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    {selectedTourOverlay.cupos_disponibles > 0 ? `${selectedTourOverlay.cupos_disponibles} cupos disponibles` : 'Grupos reducidos'}
                  </span>
                </div>
              </div>

              {/* Itinerario de Campo */}
              {selectedTourOverlay.itinerario && (
                <div className="space-y-2 bg-background p-5 rounded-2xl border border-border-custom">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Itinerario Detallado de Observación
                  </h4>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-primary/85 whitespace-pre-line font-light">
                    {selectedTourOverlay.itinerario}
                  </p>
                </div>
              )}

              {/* Servicios Incluidos y Excluidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedTourOverlay.servicios_incluidos && (
                  <div className="bg-background p-4 rounded-2xl border border-border-custom space-y-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Servicios Incluidos:
                    </h5>
                    <ul className="space-y-1.5 text-xs text-primary/80">
                      {selectedTourOverlay.servicios_incluidos.split(/\r?\n|,/).map((inc, i) => inc.trim() && (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{inc.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTourOverlay.que_llevar && (
                  <div className="bg-background p-4 rounded-2xl border border-border-custom space-y-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> ¿Qué Llevar a Campo?
                    </h5>
                    <ul className="space-y-1.5 text-xs text-primary/80">
                      {selectedTourOverlay.que_llevar.split(/\r?\n|,/).map((item, i) => item.trim() && (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-accent font-bold">•</span>
                          <span>{item.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Equipo Óptico Recomendado */}
              {selectedTourOverlay.equipoOpticoReq && (
                <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 flex items-start gap-3 text-xs">
                  <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-accent uppercase tracking-wider block text-[10px]">
                      Equipo Óptico & Fotográfico Sugerido:
                    </span>
                    <p className="text-primary/85 mt-0.5">{selectedTourOverlay.equipoOpticoReq}</p>
                  </div>
                </div>
              )}

              {/* Botones de Reserva y Consulta Directa */}
              <div className="pt-3 border-t border-border-custom flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const tourToBook = selectedTourOverlay;
                    const puntoName = selectedPunto?.nombre || 'General';
                    setSelectedTourOverlay(null);
                    openBooking({
                      serviceType: 'TOUR',
                      serviceId: String(tourToBook.id),
                      serviceTitle: `${tourToBook.nombre} (${puntoName})`,
                      unitPricePEN: Number(tourToBook.precio_adulto),
                      unitPriceUSD: tourToBook.precio_adulto_usd ? Number(tourToBook.precio_adulto_usd) : null,
                      maxGuests: tourToBook.cupos_disponibles || 10,
                      categoryBadge: `Expedición GIS • ${puntoName}`
                    });
                  }}
                  className="flex-1 bg-[#6F1D7E] hover:bg-[#581564] text-white py-3.5 px-5 rounded-2xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Reservar Expedición & Pago Yape</span>
                </button>

                <a
                  href="#rutas"
                  onClick={() => setSelectedTourOverlay(null)}
                  className="bg-primary-solid hover:bg-accent text-white hover:text-primary py-3.5 px-5 rounded-2xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <span>Ver Todas las Rutas</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
