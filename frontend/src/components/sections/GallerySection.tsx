'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContentService } from '@/services/content.service';
import type { PhotoProduct, PhotoWorkshopPackage } from '@/types';
import { useCartStore } from '@/store/cart-store';
import { useBookingStore } from '@/store/useBookingStore';
import ImageCard from '../gallery/ImageCard';
import ImageLightbox from '../gallery/ImageLightbox';
import CartDrawer from '../gallery/CartDrawer';
import { Bird, Camera, Image as ImageIcon, Calendar, BookOpen, ShoppingCart, Sparkles, X, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GallerySection() {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoProduct | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<PhotoWorkshopPackage | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'todos' | 'aves' | 'paisajes'>('todos');

  const photosSliderRef = useRef<HTMLDivElement>(null);
  const workshopsSliderRef = useRef<HTMLDivElement>(null);

  // Zustand
  const { items, addItem } = useCartStore();
  const { openBooking } = useBookingStore();
  const cartCount = items.length;

  // Consultar Fotos
  const { data: photos = [], isLoading: isLoadingPhotos } = useQuery({
    queryKey: ['photos'],
    queryFn: () => ContentService.getPhotos(),
  });

  // Consultar Talleres
  const { data: workshops = [], isLoading: isLoadingWorkshops } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => ContentService.getWorkshops(),
  });

  const scrollLeft = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -380, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 380, behavior: 'smooth' });
    }
  };

  // Filtrar Fotos
  const sortedPhotos = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
  const filteredPhotos = sortedPhotos.filter((photo) => {
    if (activeCategory === 'todos') return true;
    if (activeCategory === 'aves') return photo.type === 'AVES';
    if (activeCategory === 'paisajes') return photo.type === 'PAISAJE';
    return true;
  });

  const sortedWorkshops = [...workshops].sort((a, b) => a.sortOrder - b.sortOrder);

  // Determinar si hay más de 3 cards para activar carrusel
  const hasPhotosCarousel = filteredPhotos.length > 3;
  const hasWorkshopsCarousel = sortedWorkshops.length > 3;

  return (
    <section id="galeria" className="py-24 bg-transparent border-b border-border-custom relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ENCABEZADO DE SECCIÓN */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <span className="text-accent uppercase tracking-widest text-xs font-semibold">Galería de Aves y Naturaleza</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold mt-2 mb-4 text-primary">
              Venta de Fotos exclusivas
            </h2>
            <p className="text-primary/75 font-light leading-relaxed">
              Adquiere descargas digitales de alta resolución registradas en diferentes ecosistemas y escenarios de naturaleza.
            </p>
          </div>

          {/* Botón flotante/fijo del Carrito */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 bg-primary-solid hover:bg-accent text-white hover:text-primary px-6 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg shrink-0 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ver Carrito</span>
            {cartCount > 0 && (
              <span className="ml-1 bg-accent text-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-primary">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* TABS DE FILTRO Y CONTROLES DE CARRUSEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex justify-start gap-2.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory('todos')}
              className={`px-4.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'todos'
                  ? 'bg-primary-solid text-white border-primary shadow-sm'
                  : 'bg-background text-primary/60 border-border-custom hover:text-primary'
              }`}
            >
              Todas las Fotos ({sortedPhotos.length})
            </button>
            <button
              onClick={() => setActiveCategory('aves')}
              className={`px-4.5 py-2 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeCategory === 'aves'
                  ? 'bg-primary-solid text-white border-primary shadow-sm'
                  : 'bg-background text-primary/60 border-border-custom hover:text-primary'
              }`}
            >
              <Bird className="w-3.5 h-3.5" /> Colibríes & Aves
            </button>
            <button
              onClick={() => setActiveCategory('paisajes')}
              className={`px-4.5 py-2 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeCategory === 'paisajes'
                  ? 'bg-primary-solid text-white border-primary shadow-sm'
                  : 'bg-background text-primary/60 border-border-custom hover:text-primary'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Paisajes Andinos
            </button>
          </div>

          {/* Si hay más de 3 fotos, mostramos controles de carrusel */}
          {hasPhotosCarousel && (
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <span className="text-xs uppercase tracking-wider font-semibold text-primary/60">
                Desliza galería ({filteredPhotos.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Foto anterior"
                  onClick={() => scrollLeft(photosSliderRef)}
                  className="w-9 h-9 rounded-full bg-background hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Foto siguiente"
                  onClick={() => scrollRight(photosSliderRef)}
                  className="w-9 h-9 rounded-full bg-background hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOTOS DE GALERÍA: CARRUSEL EN UNA SOLA FILA SI > 3 CARDS, SINO FILA GRID */}
        {isLoadingPhotos ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-20 text-primary/60 text-sm">
            No se encontraron fotografías en esta categoría.
          </div>
        ) : hasPhotosCarousel ? (
          /* CARRUSEL EN UNA SOLA FILA (MÁS DE 3 CARDS) */
          <div
            ref={photosSliderRef}
            className="flex gap-6 overflow-x-auto pb-6 pt-1 snap-x snap-mandatory scroll-smooth focus:outline-none mb-24"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-[380px]"
              >
                <ImageCard
                  photo={photo}
                  onViewDetails={(p) => setSelectedPhoto(p)}
                  onOpenCart={() => setIsCartOpen(true)}
                />
              </div>
            ))}
          </div>
        ) : (
          /* UNA SOLA FILA (3 O MENOS CARDS) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="h-full">
                <ImageCard
                  photo={photo}
                  onViewDetails={(p) => setSelectedPhoto(p)}
                  onOpenCart={() => setIsCartOpen(true)}
                />
              </div>
            ))}
          </div>
        )}

        {/* SECCIÓN DE TALLERES DE FOTOGRAFÍA */}
        <div className="border-t border-border-custom pt-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="text-accent uppercase tracking-widest text-xs font-semibold">Aprendizaje & Técnica</span>
              <h3 className="font-serif text-3xl md:text-4xl font-bold mt-2 mb-3 text-primary">
                Talleres de Fotografía de Naturaleza
              </h3>
              <p className="text-primary/75 font-light leading-relaxed text-sm md:text-base">
                Aprende técnicas avanzadas de alta velocidad para capturar aves en vuelo y paisajes del Valle Sagrado junto a fotógrafos expertos.
              </p>
            </div>

            {/* Controles de carrusel si hay más de 3 talleres */}
            {hasWorkshopsCarousel && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs uppercase tracking-wider font-semibold text-primary/60 mr-2">
                  Desliza Talleres ({sortedWorkshops.length})
                </span>
                <button
                  type="button"
                  aria-label="Taller anterior"
                  onClick={() => scrollLeft(workshopsSliderRef)}
                  className="w-9 h-9 rounded-full bg-background hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Taller siguiente"
                  onClick={() => scrollRight(workshopsSliderRef)}
                  className="w-9 h-9 rounded-full bg-background hover:bg-accent text-primary border border-border-custom hover:border-accent flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {isLoadingWorkshops ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : hasWorkshopsCarousel ? (
            /* CARRUSEL DE TALLERES EN UNA SOLA FILA (> 3 CARDS) */
            <div
              ref={workshopsSliderRef}
              className="flex gap-6 overflow-x-auto pb-6 pt-1 snap-x snap-mandatory scroll-smooth focus:outline-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {sortedWorkshops.map((ws) => (
                <div
                  key={ws.id}
                  className="snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-[380px]"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    onClick={() => setSelectedWorkshop(ws)}
                    className="bg-background border border-border-custom rounded-3xl p-7 flex flex-col justify-between hover:shadow-xl transition-all cursor-pointer group h-full"
                  >
                    <div>
                      {/* Categoría */}
                      <div className="flex justify-between items-center mb-5">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-3 py-1 bg-primary/5 text-primary rounded-full flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-accent" /> Taller {ws.category}
                        </span>
                        <span className="text-xs text-primary/60 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {ws.duration}
                        </span>
                      </div>

                      <h4 className="font-serif text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">{ws.title}</h4>
                      <p className="text-xs text-primary/75 leading-relaxed font-light mb-5 line-clamp-3">
                        {ws.description}
                      </p>

                      {/* Incluye */}
                      <div className="mb-6">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-primary/40 block mb-2">Incluye:</span>
                        <ul className="space-y-1.5">
                          {ws.included.slice(0, 3).map((inc, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-primary/80">
                              <BookOpen className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                              <span className="truncate">{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Footer de tarjeta */}
                    <div className="border-t border-border-custom/50 pt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-auto">
                      <div>
                        <span className="text-[9px] text-primary/50 block uppercase tracking-wider">Inscripción</span>
                        <span className="text-xl font-serif font-bold text-primary">S/. {Number(ws.price).toFixed(2)} <span className="text-xs font-sans font-normal text-primary/60">PEN</span></span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorkshop(ws);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md bg-primary-solid hover:bg-accent text-white hover:text-primary cursor-pointer whitespace-nowrap"
                      >
                        Ver Ficha Taller
                      </button>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          ) : (
            /* FILA GRID (3 O MENOS TALLERES) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sortedWorkshops.map((ws) => (
                <motion.div
                  key={ws.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  onClick={() => setSelectedWorkshop(ws)}
                  className="bg-background border border-border-custom rounded-3xl p-7 flex flex-col justify-between hover:shadow-xl transition-all cursor-pointer group h-full"
                >
                  <div>
                    {/* Categoria */}
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-3 py-1 bg-primary/5 text-primary rounded-full flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-accent" /> Taller {ws.category}
                      </span>
                      <span className="text-xs text-primary/60 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {ws.duration}
                      </span>
                    </div>

                    <h4 className="font-serif text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">{ws.title}</h4>
                    <p className="text-xs text-primary/75 leading-relaxed font-light mb-5 line-clamp-3">
                      {ws.description}
                    </p>

                    {/* Incluye */}
                    <div className="mb-6">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-primary/40 block mb-2">Incluye:</span>
                      <ul className="space-y-1.5">
                        {ws.included.slice(0, 3).map((inc, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-primary/80">
                            <BookOpen className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                            <span className="truncate">{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer de tarjeta */}
                  <div className="border-t border-border-custom/50 pt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-auto">
                    <div>
                      <span className="text-[9px] text-primary/50 block uppercase tracking-wider">Inscripción</span>
                      <span className="text-xl font-serif font-bold text-primary">S/. {Number(ws.price).toFixed(2)} <span className="text-xs font-sans font-normal text-primary/60">PEN</span></span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWorkshop(ws);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md bg-primary-solid hover:bg-accent text-white hover:text-primary cursor-pointer whitespace-nowrap"
                    >
                      Ver Ficha Taller
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* OVERLAY MODAL: TALLER DE FOTOGRAFÍA */}
        <AnimatePresence>
          {selectedWorkshop && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
              onClick={() => setSelectedWorkshop(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-2xl w-full bg-bg-card border border-border-custom rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-primary p-6 sm:p-8"
              >
                {/* Botón Cerrar */}
                <button
                  type="button"
                  onClick={() => setSelectedWorkshop(null)}
                  className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-accent text-white hover:text-primary backdrop-blur-md border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-accent/15 text-terracotta rounded-full inline-flex items-center gap-1.5 mb-3">
                    <Camera className="w-3.5 h-3.5 text-accent" /> Taller de Fotografía • {selectedWorkshop.category}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                    {selectedWorkshop.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-primary/60 mt-2">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-accent" /> Duración: {selectedWorkshop.duration}</span>
                  </div>
                </div>

                <div className="my-6 space-y-5 overflow-y-auto pr-1">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-2">Descripción del Taller</h4>
                    <p className="text-sm text-primary/80 font-light leading-relaxed whitespace-pre-line">
                      {selectedWorkshop.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-3">
                      <Shield className="w-4 h-4 text-emerald-600" /> Qué incluye este Taller
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedWorkshop.included.map((inc, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-background border border-border-custom text-xs text-primary/80">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{inc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-background p-4 rounded-2xl border border-border-custom flex justify-between items-center">
                    <span className="text-xs text-primary/60 uppercase tracking-wider font-semibold">Inversión por Persona:</span>
                    <span className="text-2xl font-serif font-bold text-primary">S/. {Number(selectedWorkshop.price).toFixed(2)} <span className="text-xs font-sans font-normal text-primary/60">PEN</span></span>
                  </div>
                </div>

                {/* Footer Acciones */}
                <div className="pt-4 border-t border-border-custom flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const wsToBook = selectedWorkshop;
                      setSelectedWorkshop(null);
                      openBooking({
                        serviceType: 'TALLER',
                        serviceId: String(wsToBook.id),
                        serviceTitle: wsToBook.title,
                        unitPricePEN: Number(wsToBook.price),
                        unitPriceUSD: null,
                        categoryBadge: `Taller ${wsToBook.category}`,
                      });
                    }}
                    className="flex-1 bg-[#6F1D7E] hover:bg-[#581564] text-white py-4 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Inscribirse al Taller & Pago Yape</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addItem(selectedWorkshop);
                      setSelectedWorkshop(null);
                      setIsCartOpen(true);
                    }}
                    className="bg-primary-solid hover:bg-accent text-white hover:text-primary py-4 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Añadir al Carrito</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODALES FLOTANTES */}
        {selectedPhoto && (
          <ImageLightbox
            photo={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {/* DRAWER DEL CARRITO */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
        />

      </div>
    </section>
  );
}
