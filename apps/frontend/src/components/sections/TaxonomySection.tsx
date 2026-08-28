'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContentService, resolveImageUrl, resolveAudioUrl } from '@/services/content.service';
import type { EspecieColibri } from '@/types';
import { openWhatsApp } from '@/lib/whatsapp';
import {
  Bird,
  Volume2,
  Pause,
  Mountain,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Info,
  MapPin,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function TaxonomySection() {
  const [filterEndemico, setFilterEndemico] = useState<boolean | null>(null);
  const [filterIUCN, setFilterIUCN] = useState<string>('TODOS');
  const [selectedColibri, setSelectedColibri] = useState<EspecieColibri | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: colibries = [], isLoading } = useQuery({
    queryKey: ['colibriesTaxonomia'],
    queryFn: () => ContentService.getEspeciesColibries()
  });

  const filteredColibries = colibries.filter((c) => {
    if (filterEndemico !== null && c.endemicoPeru !== filterEndemico) return false;
    if (filterIUCN !== 'TODOS' && c.estadoIUCN !== filterIUCN) return false;
    return true;
  });

  // Responsive itemsPerPage calculation
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, filteredColibries.length - itemsPerPage);

  // Next & Prev handlers
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  // Reset index if filters change
  useEffect(() => {
    setCurrentIndex(0);
  }, [filterEndemico, filterIUCN]);

  // Auto-play interval: 5 seconds toward the left (handleNext)
  useEffect(() => {
    if (isPaused || filteredColibries.length <= itemsPerPage) return;

    autoPlayTimerRef.current = setInterval(() => {
      handleNext();
    }, 5000);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPaused, filteredColibries.length, itemsPerPage, handleNext]);

  const handleToggleAudio = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      audioElement?.pause();
      setPlayingAudio(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const finalAudioUrl = resolveAudioUrl(audioUrl);
      const audio = new Audio(finalAudioUrl);
      audio.play().catch(() => {
        alert('No se pudo reproducir el archivo de audio en este navegador.');
      });
      audio.onended = () => setPlayingAudio(null);
      setAudioElement(audio);
      setPlayingAudio(audioUrl);
    }
  };

  // Stop audio on unmount or when modal closes
  const handleCloseModal = () => {
    if (audioElement) {
      audioElement.pause();
      setPlayingAudio(null);
    }
    setSelectedColibri(null);
  };

  return (
    <section
      id="taxonomia"
      className="py-16 md:py-24 bg-bg-card border-b border-border-custom relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ENCABEZADO CONTEXTUAL */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-accent uppercase tracking-widest text-xs font-semibold flex items-center justify-center gap-1.5 mb-2">
            <Bird className="w-4 h-4 text-accent" /> Catálogo de Aves
          </span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-primary">
            Aves exploradas por el santuario
          </h2>
          <p className="text-primary/75 font-light leading-relaxed mt-2 text-sm md:text-base">
            Explora las especies de nuestro entorno, conoce dónde encontrarlas y descubre las mejores oportunidades para la observación y fotografía de aves y la naturaleza.
          </p>

          {/* FILTROS TAXONÓMICOS */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              onClick={() => { setFilterEndemico(null); setFilterIUCN('TODOS'); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterEndemico === null && filterIUCN === 'TODOS'
                ? 'bg-primary-solid text-white border-primary shadow-sm'
                : 'bg-background text-primary/70 border-border-custom hover:text-primary'
                }`}
            >
              Todas ({colibries.length})
            </button>
            <button
              onClick={() => setFilterEndemico(true)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${filterEndemico === true
                ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                : 'bg-background text-primary/70 border-border-custom hover:text-primary'
                }`}
            >
              🇵🇪 Solo Endémicos
            </button>
            <button
              onClick={() => { setFilterIUCN('En Peligro (EN)'); setFilterEndemico(null); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${filterIUCN === 'En Peligro (EN)'
                ? 'bg-red-700 text-white border-red-700 shadow-sm'
                : 'bg-background text-primary/70 border-border-custom hover:text-primary'
                }`}
            >
              ⚠️ En Peligro (IUCN)
            </button>
          </div>
        </div>

        {/* CONTENEDOR DEL CARRUSEL */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
          </div>
        ) : filteredColibries.length === 0 ? (
          <div className="text-center py-16 bg-background rounded-3xl border border-border-custom p-8 max-w-md mx-auto">
            <Bird className="w-10 h-10 text-primary/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-primary">No se encontraron especies con los filtros seleccionados.</p>
          </div>
        ) : (
          <div
            className="relative px-2 sm:px-4"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Ventana de Desplazamiento (Carousel Viewport) */}
            <div className="overflow-hidden py-4 -my-4">
              <motion.div
                className="flex gap-6"
                animate={{
                  x: `calc(-${currentIndex * (100 / itemsPerPage)}% - ${currentIndex * (24 / itemsPerPage)}px)`
                }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 28,
                  mass: 0.8
                }}
              >
                {filteredColibries.map((colibri) => {
                  return (
                    <div
                      key={colibri.id}
                      className="shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                    >
                      {/* CARD MINIMALISTA Y LIMPIA (IMAGEN + TAG TRANSPARENTE + FAMILIA + NOMBRE) */}
                      <div
                        onClick={() => setSelectedColibri(colibri)}
                        className="h-full bg-background border border-border-custom hover:border-accent rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver ficha de ${colibri.nombreComun}`}
                      >
                        <div>
                          {/* IMAGEN PRINCIPAL */}
                          <div className="relative h-60 sm:h-64 w-full overflow-hidden bg-primary/10">
                            <Image
                              src={resolveImageUrl(colibri.fotoPrincipal)}
                              alt={colibri.nombreComun}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                            />

                            {/* TAGS TRANSPARENTES (GLASSMORPHISM) */}
                            <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
                              {/* Tag transparente de estado IUCN */}
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/40 text-white/95 backdrop-blur-md border border-white/20 shadow-sm">
                                {colibri.estadoIUCN}
                              </span>

                              {/* Tag transparente de Endemismo */}
                              {colibri.endemicoPeru && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/40 text-[#EBE2D5] backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1">
                                  <span>🇵🇪</span> Endémico
                                </span>
                              )}
                            </div>

                            {/* Botón flotante de acción rápida */}
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-accent text-primary shadow-lg flex items-center gap-1">
                                Ver Ficha →
                              </span>
                            </div>
                          </div>

                          {/* CONTENIDO DEL CARD: SOLO FAMILIA Y NOMBRE */}
                          <div className="p-5">
                            <span className="text-[11px] font-mono text-accent font-semibold uppercase tracking-wider block mb-1">
                              Familia {colibri.familia}
                            </span>
                            <h3 className="font-serif text-xl md:text-2xl font-bold text-primary group-hover:text-accent transition-colors leading-tight mb-1">
                              {colibri.nombreComun}
                            </h3>
                            <p className="text-xs text-primary/60 italic">
                              {colibri.nombreCientifico}
                            </p>
                          </div>
                        </div>

                        {/* Pie de tarjeta sutil */}
                        <div className="px-5 pb-4 pt-0 flex items-center justify-between text-[11px] text-primary/50 border-t border-border-custom/30 mt-auto">
                          <span className="flex items-center gap-1">
                            <Mountain className="w-3.5 h-3.5 text-accent" />
                            {colibri.altitudMinMsnm}–{colibri.altitudMaxMsnm} msnm
                          </span>
                          <span className="text-accent font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Ver detalles & canto
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* Controles de Navegación (Flechas Izq / Der) */}
            {filteredColibries.length > itemsPerPage && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-5 z-10 w-10 h-10 rounded-full bg-primary-solid/90 hover:bg-accent text-white hover:text-primary flex items-center justify-center shadow-xl backdrop-blur transition-all"
                  aria-label="Especie anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-5 z-10 w-10 h-10 rounded-full bg-primary-solid/90 hover:bg-accent text-white hover:text-primary flex items-center justify-center shadow-xl backdrop-blur transition-all"
                  aria-label="Siguiente especie"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Paginación / Dots de Progreso con Timer de 5s */}
            {filteredColibries.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {Array.from({ length: maxIndex + 1 }).map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setCurrentIndex(dotIdx)}
                    className={`h-2 rounded-full transition-all duration-300 ${currentIndex === dotIdx
                      ? 'w-7 bg-accent shadow-sm'
                      : 'w-2 bg-primary/25 hover:bg-primary/50'
                      }`}
                    aria-label={`Ir al bloque ${dotIdx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL POP-UP CON INFORMACIÓN COMPLETA Y REPRODUCTOR DE SONIDO BIOACÚSTICO */}
      <AnimatePresence>
        {selectedColibri && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={handleCloseModal}
          >
            {/* Backdrop oscuro con desenfoque */}
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

            {/* Ventana Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[90vh] bg-bg-card border border-border-custom rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 text-primary"
            >
              {/* Botón de Cerrar */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors shadow-md"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="overflow-y-auto">
                {/* Imagen de Cabecera del Modal */}
                <div className="relative h-64 sm:h-80 w-full bg-primary/10">
                  <Image
                    src={resolveImageUrl(selectedColibri.fotoPrincipal)}
                    alt={selectedColibri.nombreComun}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-black/30" />

                  {/* Badges transparentes sobre la foto */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 shadow-sm">
                      {selectedColibri.estadoIUCN}
                    </span>
                    {selectedColibri.endemicoPeru && (
                      <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-900/60 text-white backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1">
                        <span>🇵🇪</span> Endémico de Perú
                      </span>
                    )}
                  </div>
                </div>

                {/* Contenido Detallado */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Encabezado Taxonómico */}
                  <div>
                    <span className="text-xs font-mono font-semibold uppercase tracking-widest text-accent block mb-1">
                      Familia {selectedColibri.familia}
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary">
                      {selectedColibri.nombreComun}
                    </h2>
                    <p className="text-base text-primary/70 italic font-serif mt-0.5">
                      {selectedColibri.nombreCientifico}
                    </p>
                  </div>

                  {/* REPRODUCTOR DE CANTO / BIOACÚSTICA */}
                  <div className="bg-primary/5 dark:bg-[#1E2C22]/40 border border-border-custom rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0">
                        <Volume2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                          Registro Bioacústico de Campo
                          {playingAudio === selectedColibri.audioCantoUrl && (
                            <span className="flex gap-0.5 items-end h-3">
                              <span className="w-1 bg-accent rounded-full animate-bounce h-2" />
                              <span className="w-1 bg-accent rounded-full animate-bounce delay-75 h-3" />
                              <span className="w-1 bg-accent rounded-full animate-bounce delay-150 h-1.5" />
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-primary/60">
                          {selectedColibri.audioCantoUrl
                            ? 'Grabación vocal de alta fidelidad registrada en hábitat natural'
                            : 'Muestra de audio en fase de recopilación ornitológica'}
                        </p>
                      </div>
                    </div>

                    {selectedColibri.audioCantoUrl ? (
                      <button
                        type="button"
                        onClick={() => handleToggleAudio(selectedColibri.audioCantoUrl!)}
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shrink-0 ${
                          playingAudio === selectedColibri.audioCantoUrl
                            ? 'bg-accent text-primary shadow-lg'
                            : 'bg-primary-solid hover:bg-accent text-white hover:text-primary shadow-md'
                        }`}
                      >
                        {playingAudio === selectedColibri.audioCantoUrl ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>Pausar Canto</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>Reproducir Canto</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-primary/40 italic">
                        Sin audio disponible
                      </span>
                    )}
                  </div>

                  {/* Descripción Taxonómica y Ecológica */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary/60 mb-2">
                      Descripción Taxonómica & Hábitat
                    </h4>
                    <p className="text-sm sm:text-base text-primary/80 font-light leading-relaxed">
                      {selectedColibri.descripcion}
                    </p>
                  </div>

                  {/* Ficha de Adaptaciones y Rango */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-background border border-border-custom rounded-2xl p-4 flex items-center gap-3">
                      <Mountain className="w-5 h-5 text-accent shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-primary/50 block">
                          Piso Altitudinal
                        </span>
                        <strong className="text-sm text-primary font-bold">
                          {selectedColibri.altitudMinMsnm} – {selectedColibri.altitudMaxMsnm} msnm
                        </strong>
                      </div>
                    </div>

                    <div className="bg-background border border-border-custom rounded-2xl p-4 flex items-center gap-3">
                      <Bird className="w-5 h-5 text-secondary shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-primary/50 block">
                          Estatus Biogeográfico
                        </span>
                        <strong className="text-sm text-primary font-bold">
                          {selectedColibri.endemicoPeru ? 'Endémico de Perú 🇵🇪' : 'Especie Neotropical'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Acciones y Consulta por WhatsApp */}
                  <div className="border-t border-border-custom pt-5 flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <button
                      type="button"
                      onClick={() => {
                        openWhatsApp('TOUR_GIS', {
                          title: `Avistamiento de ${selectedColibri.nombreComun} (${selectedColibri.nombreCientifico})`
                        });
                      }}
                      className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span>💬 Consultar Avistamiento por WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-semibold uppercase tracking-wider transition-colors text-center"
                    >
                      Cerrar Ficha
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
