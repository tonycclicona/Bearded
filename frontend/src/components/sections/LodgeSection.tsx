'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentService, resolveImageUrl } from '@/services/content.service';
import { Coffee, Flame, Wifi, Compass, Sparkles, Users, Shield, Timer, X, Maximize, ChevronLeft, ChevronRight, BedDouble, Calendar } from 'lucide-react';
import { useBookingStore } from '@/store/useBookingStore';
import Image from 'next/image';

import type { Room, LodgeExperience } from '@/types';

interface LightboxState {
  title: string;
  images: string[];
  currentIndex: number;
}

// Variantes para la transición de izquierda a derecha
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

interface RoomCardProps {
  room: Room;
  priority?: boolean;
  onSelect: (room: Room) => void;
  onOpenGallery: (title: string, images: string[], index: number) => void;
}

function RoomCard({ room, priority = false, onSelect, onOpenGallery }: RoomCardProps) {
  const images = [room.imageUrl, ...(room.gallery || [])].filter(Boolean);
  const [[photoIndex, direction], setPhotoState] = useState<[number, number]>([0, 0]);

  const paginatePhoto = (newDirection: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (images.length <= 1) return;
    setPhotoState(([prev]) => {
      const nextIndex = (prev + newDirection + images.length) % images.length;
      return [nextIndex, newDirection];
    });
  };

  const currentImage = images[photoIndex] || room.imageUrl;

  return (
    <div
      onClick={() => onSelect(room)}
      className="bg-bg-card border border-border-custom rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer h-full min-w-[280px] sm:min-w-[340px] max-w-full"
    >
      {/* Carrusel de Imágenes en la Cabecera de la Cabaña */}
      <div className="relative h-52 sm:h-56 w-full bg-primary/10 overflow-hidden select-none">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={photoIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.25 },
            }}
            className="absolute inset-0 w-full h-full"
          >
            <Image
              src={resolveImageUrl(currentImage)}
              alt={`${room.name} - Foto ${photoIndex + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority={priority && photoIndex === 0}
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 pointer-events-none" />

        {/* Badges superiores */}
        <div className="absolute top-3 left-3 bg-black/60 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm z-10 pointer-events-none">
          <Maximize className="w-3 h-3 text-accent" /> Ver Ficha
        </div>

        <div className="absolute top-3 right-3 bg-bg-card/95 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-primary flex items-center gap-1 shadow-sm z-10 pointer-events-none">
          <Users className="w-3 h-3" /> Máx. {room.capacity}
        </div>

        {/* Controles de Navegación de Fotos (Transición Izquierda a Derecha) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={(e) => paginatePhoto(-1, e)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={(e) => paginatePhoto(1, e)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots Indicadores de Fotos */}
            <div className="absolute bottom-2.5 inset-x-0 flex justify-center items-center gap-1.5 z-10 pointer-events-none">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === photoIndex
                      ? 'w-5 bg-accent shadow-sm'
                      : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>

            {/* Contador de fotos y botón para galería completa */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenGallery(room.name, images, photoIndex);
              }}
              className="absolute bottom-2.5 right-2.5 z-10 bg-black/75 hover:bg-accent text-white hover:text-primary text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md border border-white/20 transition-colors cursor-pointer"
            >
              {photoIndex + 1}/{images.length} fotos
            </button>
          </>
        )}
      </div>

      <div className="p-5 lg:p-6 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-serif text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors">
            {room.name}
          </h3>

          {/* Amenities */}
          <ul className="space-y-2 mb-5">
            {room.amenities.slice(0, 4).map((amenity, i) => {
              let Icon = Compass;
              if (amenity.toLowerCase().includes('desayuno') || amenity.toLowerCase().includes('buffet')) Icon = Coffee;
              if (amenity.toLowerCase().includes('chimenea') || amenity.toLowerCase().includes('calefactor')) Icon = Flame;
              if (amenity.toLowerCase().includes('wi-fi') || amenity.toLowerCase().includes('internet')) Icon = Wifi;
              if (amenity.toLowerCase().includes('cama') || amenity.toLowerCase().includes('suite')) Icon = BedDouble;
              return (
                <li key={i} className="flex items-center gap-2.5 text-xs text-primary/80">
                  <Icon className="w-4 h-4 text-accent shrink-0" />
                  <span className="truncate">{amenity}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Precio & Reserva */}
        <div className="border-t border-border-custom/50 pt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-auto">
          <div>
            <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Precio por noche</span>
            <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
              {(room.showPEN ?? true) && (
                <span className="text-lg lg:text-xl font-serif font-bold text-primary">
                  S/. {Number(room.pricePerNight).toFixed(2)} <span className="text-xs font-sans font-normal text-primary/60">PEN</span>
                </span>
              )}
              {room.showUSD && room.pricePerNightUSD != null && (
                <span className={`font-serif font-bold ${!(room.showPEN ?? true) ? 'text-lg lg:text-xl text-primary' : 'text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200'}`}>
                  ${Number(room.pricePerNightUSD).toFixed(2)} <span className="text-[10px] font-sans font-normal text-emerald-700">USD</span>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="bg-primary-solid hover:bg-accent hover:text-primary text-white font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(room);
            }}
          >
            Ver Ficha
          </button>
        </div>
      </div>
    </div>
  );
}

interface ExperienceCardProps {
  experience: LodgeExperience;
  onSelect: (exp: LodgeExperience) => void;
}

function ExperienceCard({ experience, onSelect }: ExperienceCardProps) {
  return (
    <div
      onClick={() => onSelect(experience)}
      className="bg-bg-card border border-border-custom rounded-3xl overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all p-5 lg:p-6 cursor-pointer group h-full min-w-[280px] sm:min-w-[340px] max-w-full"
    >
      <div>
        {/* Cabecera con Imagen Panorámica o Círculo */}
        {experience.imageUrl ? (
          <div className="relative h-44 sm:h-48 -mx-5 -mt-5 lg:-mx-6 lg:-mt-6 mb-4 overflow-hidden group-hover:opacity-95 transition-opacity">
            <Image
              src={resolveImageUrl(experience.imageUrl)}
              alt={experience.title}
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3">
              <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 bg-black/60 text-white rounded-full backdrop-blur-md inline-flex items-center gap-1 border border-white/20">
                <Sparkles className="w-3 h-3 text-accent" /> Aventura & Sabor
              </span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-white flex justify-between items-end">
              <span className="text-xs flex items-center gap-1 font-medium bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                <Timer className="w-3.5 h-3.5 text-accent" />
                {experience.duration}
              </span>
              <span className="text-[10px] font-semibold text-white/90 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
                Ver Detalles
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start gap-3 mb-4">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 bg-accent/15 text-terracotta rounded-full inline-flex items-center gap-1 mb-2">
                <Sparkles className="w-3 h-3" /> Aventura & Sabor
              </span>
              <div className="flex items-center gap-1 text-xs text-primary/60 mt-1">
                <Timer className="w-3.5 h-3.5" />
                <span>{experience.duration}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <Compass className="w-6 h-6" />
            </div>
          </div>
        )}

        <h3 className="font-serif text-xl font-bold text-primary group-hover:text-accent transition-colors mb-2">
          {experience.title}
        </h3>

        <p className="text-sm text-primary/75 font-light leading-relaxed mb-4 line-clamp-3">
          {experience.description}
        </p>

        {/* Inclusiones */}
        {experience.included && experience.included.length > 0 && (
          <div className="mb-5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary/50 block mb-2">Qué incluye:</span>
            <ul className="space-y-1.5">
              {experience.included.slice(0, 3).map((inc, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-primary/80">
                  <Shield className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                  <span className="truncate">{inc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border-custom/50 pt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-auto">
        <div>
          <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Costo por persona</span>
          <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
            {(experience.showPEN ?? true) && (
              <span className="text-lg lg:text-xl font-serif font-bold text-primary">
                S/. {Number(experience.price).toFixed(2)} <span className="text-xs font-sans font-normal text-primary/60">PEN</span>
              </span>
            )}
            {experience.showUSD && experience.priceUSD != null && (
              <span className={`font-serif font-bold ${!(experience.showPEN ?? true) ? 'text-lg lg:text-xl text-primary' : 'text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200'}`}>
                ${Number(experience.priceUSD).toFixed(2)} <span className="text-[10px] font-sans font-normal text-emerald-700">USD</span>
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="bg-primary-solid hover:bg-accent hover:text-primary text-white font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(experience);
          }}
        >
          Ver Ficha
        </button>
      </div>
    </div>
  );
}

export default function LodgeSection() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'experiences'>('rooms');
  const [lightboxData, setLightboxData] = useState<LightboxState | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<LodgeExperience | null>(null);
  const { openBooking } = useBookingStore();

  const roomsSliderRef = useRef<HTMLDivElement>(null);
  const experiencesSliderRef = useRef<HTMLDivElement>(null);

  // Consulta de Habitaciones
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => ContentService.getRooms(),
  });

  // Consulta de Experiencias
  const { data: experiences = [], isLoading: isLoadingExperiences } = useQuery({
    queryKey: ['experiences'],
    queryFn: () => ContentService.getExperiences(),
  });

  const scrollLeft = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  const sortedRooms = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedExperiences = [...experiences].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section id="lodge" className="py-14 md:py-16 lg:py-20 bg-background border-b border-border-custom overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Encabezado */}
        <div className="text-center max-w-2xl mx-auto mb-8 lg:mb-10">
          <span className="text-accent uppercase tracking-widest text-xs font-semibold">Estadía & Aventura</span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold mt-2 text-primary">
            Lodge & Experiencias en San Salvador
          </h2>
          <p className="text-primary/75 font-light leading-relaxed mt-2 text-sm md:text-base">
            Hospédate a minutos del Santuario de Colibríes o vive actividades exclusivas en el Valle Sagrado.
          </p>

          {/* Toggle de Pestañas */}
          <div className="flex justify-center mt-6">
            <div className="bg-bg-card p-1.5 rounded-full border border-border-custom inline-flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('rooms')}
                className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'rooms'
                    ? 'bg-primary-solid text-white shadow-md'
                    : 'text-primary/60 hover:text-primary'
                }`}
              >
                Cabañas & Suites ({rooms.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('experiences')}
                className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'experiences'
                    ? 'bg-primary-solid text-white shadow-md'
                    : 'text-primary/60 hover:text-primary'
                }`}
              >
                Experiencias de Aventura ({experiences.length})
              </button>
            </div>
          </div>
        </div>

        {/* Pestaña: Habitaciones */}
        {activeTab === 'rooms' ? (
          <motion.div
            key="rooms-tab"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Controles de Navegación del Carrusel Horizontal */}
            {sortedRooms.length > 0 && (
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-primary/60">
                    Desliza para explorar opciones
                  </span>
                  <span className="hidden sm:inline-block text-[11px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold">
                    {sortedRooms.length} Cabañas disponibles
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Cabaña anterior"
                    onClick={() => scrollLeft(roomsSliderRef)}
                    className="w-9 h-9 rounded-full bg-bg-card hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cabaña siguiente"
                    onClick={() => scrollRight(roomsSliderRef)}
                    className="w-9 h-9 rounded-full bg-bg-card hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {isLoadingRooms ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : sortedRooms.length === 0 ? (
              <div className="text-center py-12 text-primary/60 text-sm">
                No hay cabañas registradas en este momento.
              </div>
            ) : (
              /* Carrusel Contenedor Horizontal con Transición Izquierda / Derecha */
              <div
                ref={roomsSliderRef}
                className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth scrollbar-thin scrollbar-thumb-border-custom focus:outline-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {sortedRooms.map((room, idx) => (
                  <div
                    key={room.id}
                    className="snap-start shrink-0 w-[85vw] sm:w-[380px] lg:w-[390px]"
                  >
                    <RoomCard
                      room={room}
                      priority={idx === 0}
                      onSelect={(r) => setSelectedRoom(r)}
                      onOpenGallery={(title, images, index) =>
                        setLightboxData({ title, images, currentIndex: index })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* Pestaña: Experiencias de Aventura */
          <motion.div
            key="experiences-tab"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Controles de Navegación del Carrusel Horizontal */}
            {sortedExperiences.length > 0 && (
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-primary/60">
                    Desliza para explorar experiencias
                  </span>
                  <span className="hidden sm:inline-block text-[11px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold">
                    {sortedExperiences.length} Actividades
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Experiencia anterior"
                    onClick={() => scrollLeft(experiencesSliderRef)}
                    className="w-9 h-9 rounded-full bg-bg-card hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Experiencia siguiente"
                    onClick={() => scrollRight(experiencesSliderRef)}
                    className="w-9 h-9 rounded-full bg-bg-card hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {isLoadingExperiences ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : sortedExperiences.length === 0 ? (
              <div className="text-center py-12 text-primary/60 text-sm">
                No hay experiencias registradas en este momento.
              </div>
            ) : (
              /* Carrusel Contenedor Horizontal para Experiencias */
              <div
                ref={experiencesSliderRef}
                className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth scrollbar-thin scrollbar-thumb-border-custom focus:outline-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {sortedExperiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="snap-start shrink-0 w-[85vw] sm:w-[380px] lg:w-[390px]"
                  >
                    <ExperienceCard
                      experience={exp}
                      onSelect={(e) => setSelectedExperience(e)}
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* OVERLAY MODAL: HABITACIÓN / CABAÑA DEL LODGE */}
      <AnimatePresence>
        {selectedRoom && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedRoom(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-bg-card border border-border-custom rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-primary"
            >
              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-accent text-white hover:text-primary backdrop-blur-md border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Galería / Portada Superior */}
              <div className="relative h-64 sm:h-80 w-full bg-black shrink-0 overflow-hidden">
                <Image
                  src={resolveImageUrl(selectedRoom.imageUrl)}
                  alt={selectedRoom.name}
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
                  <div>
                    <span className="text-accent uppercase tracking-widest text-[10px] font-bold block mb-1">
                      Cabaña & Alojamiento Rústico
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md">
                      {selectedRoom.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const allPics = [selectedRoom.imageUrl, ...(selectedRoom.gallery || [])].filter(Boolean);
                      setLightboxData({
                        title: selectedRoom.name,
                        images: allPics,
                        currentIndex: 0,
                      });
                    }}
                    className="bg-white/20 hover:bg-accent text-white hover:text-primary backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-white/30 transition-all cursor-pointer"
                  >
                    <Maximize className="w-3.5 h-3.5" />
                    <span>Ver Galería ({1 + (selectedRoom.gallery?.length || 0)})</span>
                  </button>
                </div>
              </div>

              {/* Contenido del Overlay */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
                {/* Cuadrícula de Información Clave */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-background p-4 rounded-2xl border border-border-custom text-xs">
                  <div>
                    <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Capacidad</span>
                    <span className="text-sm font-bold text-primary flex items-center gap-1.5 mt-0.5">
                      <Users className="w-4 h-4 text-accent" /> Hasta {selectedRoom.capacity} Huéspedes
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Ubicación</span>
                    <span className="text-sm font-bold text-primary flex items-center gap-1.5 mt-0.5">
                      <Compass className="w-4 h-4 text-accent" /> San Salvador, Cusco
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Tarifa Noche</span>
                    <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                      {(selectedRoom.showPEN ?? true) && (
                        <span className="text-base font-serif font-bold text-primary">
                          S/. {Number(selectedRoom.pricePerNight).toFixed(2)} <span className="text-[10px] font-sans font-normal text-primary/60">PEN</span>
                        </span>
                      )}
                      {selectedRoom.showUSD && selectedRoom.pricePerNightUSD != null && (
                        <span className={`font-serif font-bold ${!(selectedRoom.showPEN ?? true) ? 'text-base text-primary' : 'text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200'}`}>
                          ${Number(selectedRoom.pricePerNightUSD).toFixed(2)} <span className="text-[10px] font-sans font-normal text-emerald-700">USD</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amenidades y Servicios del Lodge */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-accent" /> Comodidades & Servicios Incluidos
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedRoom.amenities.map((amenity, i) => {
                      let Icon = Compass;
                      if (amenity.toLowerCase().includes('desayuno') || amenity.toLowerCase().includes('buffet')) Icon = Coffee;
                      if (amenity.toLowerCase().includes('chimenea') || amenity.toLowerCase().includes('calefactor')) Icon = Flame;
                      if (amenity.toLowerCase().includes('wi-fi') || amenity.toLowerCase().includes('internet')) Icon = Wifi;
                      return (
                        <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border-custom text-xs text-primary/85">
                          <Icon className="w-4 h-4 text-accent shrink-0" />
                          <span>{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botón de Reserva con Yape y WhatsApp */}
                <div className="pt-4 border-t border-border-custom flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const roomToBook = selectedRoom;
                      setSelectedRoom(null);
                      openBooking({
                        serviceType: 'LODGE',
                        serviceId: roomToBook.id,
                        serviceTitle: roomToBook.name,
                        unitPricePEN: Number(roomToBook.pricePerNight),
                        unitPriceUSD: roomToBook.pricePerNightUSD ? Number(roomToBook.pricePerNightUSD) : null,
                        maxGuests: roomToBook.capacity || 4,
                        categoryBadge: 'Cabaña & Lodge',
                      });
                    }}
                    className="flex-1 bg-[#6F1D7E] hover:bg-[#581564] text-white py-4 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Reservar Cabaña & Pago Yape</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY MODAL: EXPERIENCIA DE AVENTURA */}
      <AnimatePresence>
        {selectedExperience && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedExperience(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-bg-card border border-border-custom rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-primary"
            >
              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={() => setSelectedExperience(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-accent text-white hover:text-primary backdrop-blur-md border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Imagen / Portada */}
              {selectedExperience.imageUrl && (
                <div className="relative h-60 sm:h-72 w-full bg-black shrink-0 overflow-hidden">
                  <Image
                    src={resolveImageUrl(selectedExperience.imageUrl)}
                    alt={selectedExperience.title}
                    fill
                    priority
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-accent uppercase tracking-widest text-[10px] font-bold block mb-1">
                      Aventura & Gastronomía Local
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md">
                      {selectedExperience.title}
                    </h3>
                  </div>
                </div>
              )}

              {/* Contenido */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
                {!selectedExperience.imageUrl && (
                  <div>
                    <span className="text-accent uppercase tracking-widest text-xs font-bold block mb-1">
                      Aventura & Gastronomía Local
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
                      {selectedExperience.title}
                    </h3>
                  </div>
                )}

                {/* Cuadrícula de Datos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-background p-4 rounded-2xl border border-border-custom text-xs">
                  <div>
                    <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Duración</span>
                    <span className="text-sm font-bold text-primary flex items-center gap-1.5 mt-0.5">
                      <Timer className="w-4 h-4 text-accent" /> {selectedExperience.duration}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Tipo de Actividad</span>
                    <span className="text-sm font-bold text-primary flex items-center gap-1.5 mt-0.5">
                      <Sparkles className="w-4 h-4 text-accent" /> Guiado & Vivencial
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Inversión por Persona</span>
                    <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                      {(selectedExperience.showPEN ?? true) && (
                        <span className="text-base font-serif font-bold text-primary">
                          S/. {Number(selectedExperience.price).toFixed(2)} <span className="text-[10px] font-sans font-normal text-primary/60">PEN</span>
                        </span>
                      )}
                      {selectedExperience.showUSD && selectedExperience.priceUSD != null && (
                        <span className={`font-serif font-bold ${!(selectedExperience.showPEN ?? true) ? 'text-base text-primary' : 'text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200'}`}>
                          ${Number(selectedExperience.priceUSD).toFixed(2)} <span className="text-[10px] font-sans font-normal text-emerald-700">USD</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Descripción Detallada */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Descripción de la Actividad</h4>
                  <p className="text-sm text-primary/80 font-light leading-relaxed whitespace-pre-line">
                    {selectedExperience.description}
                  </p>
                </div>

                {/* Qué Incluye */}
                {selectedExperience.included && selectedExperience.included.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-600" /> Servicios & Equipamiento Incluido
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedExperience.included.map((inc, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-background border border-border-custom text-xs text-primary/80">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{inc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón de Reserva con Yape y WhatsApp */}
                <div className="pt-4 border-t border-border-custom flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const expToBook = selectedExperience;
                      setSelectedExperience(null);
                      openBooking({
                        serviceType: 'EXPERIENCIA',
                        serviceId: expToBook.id,
                        serviceTitle: expToBook.title,
                        unitPricePEN: Number(expToBook.price),
                        unitPriceUSD: expToBook.priceUSD ? Number(expToBook.priceUSD) : null,
                        categoryBadge: 'Aventura & Sabor',
                      });
                    }}
                    className="flex-1 bg-[#6F1D7E] hover:bg-[#581564] text-white py-4 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Reservar Experiencia & Pago Yape</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL LIGHTBOX DE PANTALLA COMPLETA PARA FOTOS */}
      <AnimatePresence>
        {lightboxData && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setLightboxData(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full h-[75vh] sm:h-[80vh] flex flex-col items-center justify-center"
            >
              {/* Botón Cerrar */}
              <button
                type="button"
                aria-label="Cerrar vista completa"
                onClick={() => setLightboxData(null)}
                className="absolute -top-12 right-0 sm:top-4 sm:right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-accent text-white hover:text-primary backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Imagen en Pantalla Completa con Transición Izquierda / Derecha */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/40">
                <Image
                  src={resolveImageUrl(lightboxData.images[lightboxData.currentIndex])}
                  alt={lightboxData.title}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />

                {/* Overlay de Título y Contador */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 text-white flex justify-between items-end">
                  <div>
                    <span className="text-accent uppercase tracking-widest text-[10px] font-bold block mb-1">
                      Visualización en Pantalla Completa
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold">
                      {lightboxData.title}
                    </h3>
                  </div>
                  {lightboxData.images.length > 1 && (
                    <span className="text-xs font-mono text-white/80 bg-black/60 px-3 py-1 rounded-full border border-white/20">
                      {lightboxData.currentIndex + 1} / {lightboxData.images.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Controles de Navegación si hay más de 1 imagen */}
              {lightboxData.images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Foto anterior"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxData((prev) =>
                        prev
                          ? {
                              ...prev,
                              currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
                            }
                          : null
                      );
                    }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-accent text-white hover:text-primary backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xl cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Foto siguiente"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxData((prev) =>
                        prev
                          ? {
                              ...prev,
                              currentIndex: (prev.currentIndex + 1) % prev.images.length,
                            }
                          : null
                      );
                    }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-accent text-white hover:text-primary backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xl cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
