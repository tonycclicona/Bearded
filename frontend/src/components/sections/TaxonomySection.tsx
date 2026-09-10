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
  ExternalLink,
  FileDown,
  Video,
  Play
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function TaxonomySection() {
  const [filterEndemico, setFilterEndemico] = useState<boolean | null>(null);
  const [filterIUCN, setFilterIUCN] = useState<string>('TODOS');
  const [selectedColibri, setSelectedColibri] = useState<EspecieColibri | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isCatalogVideoOpen, setIsCatalogVideoOpen] = useState(false);

  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Consulta de Especies
  const { data: colibries = [], isLoading } = useQuery({
    queryKey: ['colibriesTaxonomia'],
    queryFn: () => ContentService.getEspeciesColibries()
  });

  // Consulta de Configuración del Catálogo (Brochure PDF & Video WebP)
  const { data: catalogSettings } = useQuery({
    queryKey: ['catalogSettings'],
    queryFn: () => ContentService.getCatalogSettings(),
    initialData: {
      pdfUrl: '',
      videoUrl: '',
      title: 'Catálogo Oficial de Aves del Santuario',
      description: 'Descarga nuestro catálogo ornitológico oficial en PDF.'
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">

        {/* BURBUJA FLOTANTE EN LA ESQUINA SUPERIOR DERECHA: DESCARGA DE PDF Y VIDEO */}
        <div className="sm:absolute sm:top-0 sm:right-6 z-20 flex flex-wrap items-center justify-center sm:justify-end gap-2.5 mb-8 sm:mb-0">
          {/* Burbuja Destacada de Descarga de PDF */}
          <a
            href={catalogSettings.pdfUrl ? resolveImageUrl(catalogSettings.pdfUrl) : '#taxonomia'}
            target={catalogSettings.pdfUrl ? '_blank' : undefined}
            rel="noreferrer"
            download={catalogSettings.pdfUrl ? true : undefined}
            onClick={(e) => {
              if (!catalogSettings.pdfUrl) {
                e.preventDefault();
                alert('El catálogo en formato PDF se está actualizando con los registros más recientes del santuario.');
              }
            }}
            className="group relative inline-flex items-center gap-2.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-gradient-to-r from-red-700 via-red-600 to-rose-700 hover:from-red-800 hover:to-rose-800 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/25 cursor-pointer"
            title="Descargar Catálogo Oficial de Aves en PDF"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300"></span>
            </span>
            <FileDown className="w-4 h-4 text-white group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
              Descargar Catálogo PDF
            </span>
          </a>

          {/* Burbuja Opcional de Video / WebP del Catálogo */}
          {catalogSettings.videoUrl && (
            <button
              type="button"
              onClick={() => setIsCatalogVideoOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-primary-solid hover:bg-accent text-white hover:text-primary shadow-md hover:shadow-lg transition-all duration-300 border border-white/15 text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 whitespace-nowrap"
              title="Ver Video / WebP del Catálogo"
            >
              <Play className="w-3.5 h-3.5 fill-current text-accent" />
              <span>Ver Video Catálogo</span>
            </button>
          )}
        </div>

        {/* ENCABEZADO CONTEXTUAL */}
        <div className="text-center max-w-3xl mx-auto mb-10 pt-2 sm:pt-0">
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${filterEndemico === null && filterIUCN === 'TODOS'
                ? 'bg-primary-solid text-white border-primary shadow-sm'
                : 'bg-background text-primary/70 border-border-custom hover:text-primary'
                }`}
            >
              Todas ({colibries.length})
            </button>
            <button
              onClick={() => setFilterEndemico(true)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${filterEndemico === true
                ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                : 'bg-background text-primary/70 border-border-custom hover:text-primary'
                }`}
            >
              🇵🇪 Solo Endémicos
            </button>
            <button
              onClick={() => setFilterEndemico(false)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${filterEndemico === false
                ? 'bg-primary-solid text-white border-primary shadow-sm'
                : 'bg-background text-primary/70 border-border-custom hover:text-primary'
                }`}
            >
              Neotropicales
            </button>
            <div className="h-4 w-px bg-border-custom mx-1 hidden sm:block" />
            {['En Peligro (EN)', 'Casi Amenazado (NT)', 'Preocupación Menor (LC)'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterIUCN(filterIUCN === status ? 'TODOS' : status)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${filterIUCN === status
                  ? 'bg-accent text-primary border-accent font-bold shadow-sm'
                  : 'bg-background text-primary/60 border-border-custom hover:text-primary'
                  }`}
              >
                {status.split(' ')[0]} {status.includes('(') ? `(${status.split('(')[1]}` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* CARRUSEL DE AVES */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : filteredColibries.length === 0 ? (
          <div className="text-center py-16 bg-background rounded-3xl border border-border-custom text-primary/70">
            <Bird className="w-12 h-12 mx-auto text-primary/30 mb-3" />
            <p className="text-base font-semibold">No se encontraron especies con estos filtros.</p>
            <button
              onClick={() => { setFilterEndemico(null); setFilterIUCN('TODOS'); }}
              className="mt-3 text-xs text-accent font-bold uppercase tracking-wider hover:underline"
            >
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Contenedor del Carrusel Deslizante */}
            <div className="overflow-hidden px-1 py-4">
              <div
                className="flex transition-transform duration-700 ease-out"
                style={{
                  transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`
                }}
              >
                {filteredColibries.map((colibri) => {
                  const isPlaying = playingAudio === colibri.audioCantoUrl;

                  return (
                    <div
                      key={colibri.id}
                      className="px-3 shrink-0"
                      style={{ width: `${100 / itemsPerPage}%` }}
                    >
                      <div
                        onClick={() => setSelectedColibri(colibri)}
                        className="h-full bg-background border border-border-custom rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col group cursor-pointer"
                      >
                        {/* Fotografía de la especie */}
                        <div className="relative h-56 sm:h-64 w-full bg-primary/10 overflow-hidden shrink-0">
                          <Image
                            src={resolveImageUrl(colibri.fotoPrincipal)}
                            alt={colibri.nombreComun}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                          {/* Badges superiores */}
                          <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
                            {colibri.endemicoPeru ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-900/90 text-purple-200 backdrop-blur-md border border-purple-400/30 shadow-sm">
                                🇵🇪 Endémico
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/60 text-white/90 backdrop-blur-md">
                                Neotropical
                              </span>
                            )}

                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/60 text-accent backdrop-blur-md border border-accent/30">
                              {colibri.estadoIUCN.split(' ')[0]}
                            </span>
                          </div>

                          {/* Indicador de Video o Audio en la tarjeta */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
                            {colibri.videoUrl && (
                              <span className="bg-amber-900/80 text-amber-200 border border-amber-300/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                                <Video className="w-2.5 h-2.5" /> Video
                              </span>
                            )}
                            {colibri.audioCantoUrl && (
                              <span className="bg-black/60 text-white/90 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                                <Volume2 className="w-2.5 h-2.5 text-accent" /> Canto
                              </span>
                            )}
                          </div>

                          {/* Botón de reproducción de canto flotante */}
                          {colibri.audioCantoUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAudio(colibri.audioCantoUrl!);
                              }}
                              className={`absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg ${isPlaying
                                ? 'bg-accent text-primary scale-110'
                                : 'bg-black/60 text-white hover:bg-accent hover:text-primary hover:scale-105'
                                }`}
                              title={isPlaying ? 'Pausar canto' : 'Escuchar canto'}
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                          )}
                        </div>

                        {/* Cuerpo informativo */}
                        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold block mb-1">
                              {colibri.familia}
                            </span>
                            <h3 className="font-serif text-xl sm:text-2xl font-bold text-primary group-hover:text-accent transition-colors leading-snug mb-1">
                              {colibri.nombreComun}
                            </h3>
                            <p className="text-xs text-primary/70 italic font-serif mb-3">
                              {colibri.nombreCientifico}
                            </p>

                            <p className="text-xs text-primary/75 font-light leading-relaxed line-clamp-3 mb-4">
                              {colibri.descripcion}
                            </p>
                          </div>

                          <div className="border-t border-border-custom/60 pt-4 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1.5 text-xs text-primary/70 font-mono">
                              <Mountain className="w-3.5 h-3.5 text-accent" />
                              <span>{colibri.altitudMinMsnm} - {colibri.altitudMaxMsnm} msnm</span>
                            </div>

                            <span className="text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                              Ficha <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controles de Navegación del Carrusel */}
            {filteredColibries.length > itemsPerPage && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-bg-card hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all shadow-xl hover:scale-105 cursor-pointer active:scale-95"
                  aria-label="Colibrí anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-bg-card hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all shadow-xl hover:scale-105 cursor-pointer active:scale-95"
                  aria-label="Colibrí siguiente"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Indicador de Posición / Puntos */}
            {filteredColibries.length > itemsPerPage && (
              <div className="flex justify-center items-center gap-1.5 mt-6">
                {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${idx === currentIndex
                      ? 'w-6 bg-accent'
                      : 'w-2 bg-primary/20 hover:bg-primary/40'
                      }`}
                    aria-label={`Ir al grupo ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* OVERLAY MODAL: VIDEO PROMOCIONAL DEL CATÁLOGO */}
      <AnimatePresence>
        {isCatalogVideoOpen && catalogSettings.videoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setIsCatalogVideoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full bg-bg-card border border-border-custom rounded-3xl overflow-hidden shadow-2xl flex flex-col text-primary"
            >
              <div className="p-4 sm:p-5 border-b border-border-custom flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-accent" />
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-primary">
                    {catalogSettings.title || 'Catálogo Oficial de Aves del Santuario'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCatalogVideoOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-accent text-white hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-6 bg-black flex items-center justify-center">
                <video
                  controls
                  autoPlay
                  playsInline
                  src={resolveImageUrl(catalogSettings.videoUrl)}
                  className="w-full max-h-[65vh] rounded-2xl bg-black object-contain shadow-2xl"
                />
              </div>

              <div className="p-4 sm:p-5 bg-background flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-xs text-primary/70 font-light">
                  {catalogSettings.description || 'Exploración ornitológica de las especies registradas en el santuario.'}
                </p>
                {catalogSettings.pdfUrl && (
                  <a
                    href={resolveImageUrl(catalogSettings.pdfUrl)}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-red-700 to-rose-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Descargar PDF</span>
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY MODAL: FICHA ORNITOLÓGICA COMPLETA DE LA ESPECIE */}
      <AnimatePresence>
        {selectedColibri && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-bg-card border border-border-custom rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-primary"
            >
              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-accent text-white hover:text-primary backdrop-blur-md border border-white/20 flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                aria-label="Cerrar ficha"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="overflow-y-auto">
                {/* Cabecera / Fotografía Panorámica */}
                <div className="relative h-64 sm:h-80 w-full bg-primary/10 overflow-hidden">
                  <Image
                    src={resolveImageUrl(selectedColibri.fotoPrincipal)}
                    alt={selectedColibri.nombreComun}
                    fill
                    priority
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badges superiores */}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
                    <div>
                      <span className="text-accent uppercase tracking-widest text-[10px] font-bold block mb-1">
                        Ficha Biológica del Santuario
                      </span>
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md">
                        {selectedColibri.nombreComun}
                      </h3>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 text-accent backdrop-blur-md border border-accent/40">
                      UICN: {selectedColibri.estadoIUCN}
                    </span>
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
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer ${
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

                  {/* VIDEO / CLIP WEBP DE LA ESPECIE (SI ESTÁ DISPONIBLE) */}
                  {selectedColibri.videoUrl && (
                    <div className="bg-black/90 border border-border-custom rounded-2xl p-4 text-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                          <Video className="w-4 h-4" /> Clip de Video / WebP de la Especie
                        </span>
                        <span className="text-[10px] text-white/60 font-mono">
                          Observación en Movimiento
                        </span>
                      </div>
                      <video
                        controls
                        playsInline
                        src={resolveImageUrl(selectedColibri.videoUrl)}
                        className="w-full max-h-72 rounded-xl bg-black object-contain shadow-lg"
                      />
                    </div>
                  )}

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
                      className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>💬 Consultar Avistamiento por WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-semibold uppercase tracking-wider transition-colors text-center cursor-pointer"
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
