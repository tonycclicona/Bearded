'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContentService } from '@/services/content.service';
import type { PhotoProduct, PhotoWorkshopPackage } from '@/types';
import { useCartStore } from '@/store/cart-store';
import { useBookingStore } from '@/store/useBookingStore';
import ImageCard from '../gallery/ImageCard';
import ImageLightbox from '../gallery/ImageLightbox';
import CartDrawer from '../gallery/CartDrawer';
import { Bird, Camera, Image as ImageIcon, Calendar, BookOpen, ShoppingCart, MessageCircle, Sparkles, X, Shield, Users } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { motion, AnimatePresence } from 'framer-motion';

export default function GallerySection() {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoProduct | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<PhotoWorkshopPackage | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'todos' | 'aves' | 'paisajes'>('todos');

  // Zustand
  const { items, addItem } = useCartStore();
  const { openBooking } = useBookingStore();
  const cartCount = items.length;

  // Consultar Fotos
  const { data: photos = [], isLoading: isLoadingPhotos } = useQuery({
    queryKey: ['photos'],
    queryFn: () => ContentService.getPhotos()
  });

  // Consultar Talleres
  const { data: workshops = [], isLoading: isLoadingWorkshops } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => ContentService.getWorkshops()
  });

  // Filtrar Fotos
  const sortedPhotos = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
  const filteredPhotos = sortedPhotos.filter(photo => {
    if (activeCategory === 'todos') return true;
    if (activeCategory === 'aves') return photo.type === 'AVES';
    if (activeCategory === 'paisajes') return photo.type === 'PAISAJE';
    return true;
  });

  return (
    <section id="galeria" className="py-24 bg-bg-card border-b border-border-custom relative">
      <div className="max-w-7xl mx-auto px-6">

        {/* ENCABEZADO DE SECCIÓN */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
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
            className="flex items-center gap-2 bg-primary-solid hover:bg-accent text-white hover:text-primary px-6 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg shrink-0"
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

        {/* TABS DE FILTRO (Sólo para la galería fotográfica) */}
        <div className="flex justify-start gap-3 mb-10 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategory('todos')}
            className={`px-5 py-2 rounded-full text-xs font-semibold border transition-all ${activeCategory === 'todos'
              ? 'bg-primary-solid text-white border-primary'
              : 'bg-background text-primary/60 border-border-custom hover:text-primary'
              }`}
          >
            Todas las Fotos
          </button>
          <button
            onClick={() => setActiveCategory('aves')}
            className={`px-5 py-2 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${activeCategory === 'aves'
              ? 'bg-primary-solid text-white border-primary'
              : 'bg-background text-primary/60 border-border-custom hover:text-primary'
              }`}
          >
            <Bird className="w-3.5 h-3.5" /> Colibríes & Aves
          </button>
          <button
            onClick={() => setActiveCategory('paisajes')}
            className={`px-5 py-2 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${activeCategory === 'paisajes'
              ? 'bg-primary-solid text-white border-primary'
              : 'bg-background text-primary/60 border-border-custom hover:text-primary'
              }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Paisajes Andinos
          </button>
        </div>

        {/* GRILLA DE FOTOS */}
        {isLoadingPhotos ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-20 text-primary/60">
            No se encontraron fotografías en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
            {filteredPhotos.map((photo) => (
              <ImageCard
                key={photo.id}
                photo={photo}
                onViewDetails={(p) => setSelectedPhoto(p)}
                onOpenCart={() => setIsCartOpen(true)}
              />
            ))}
          </div>
        )}

        {/* SECCIÓN DE TALLERES DE FOTOGRAFÍA */}
        <div className="border-t border-border-custom pt-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-accent uppercase tracking-widest text-xs font-semibold">Aprendizaje & Técnica</span>
            <h3 className="font-serif text-3xl md:text-4xl font-bold mt-2 mb-3 text-primary">
              Talleres de Fotografía de Naturaleza
            </h3>
            <p className="text-primary/75 font-light leading-relaxed text-sm md:text-base">
              Aprende técnicas avanzadas de alta velocidad para capturar aves en vuelo y paisajes del Valle Sagrado junto a fotógrafos expertos.
            </p>
          </div>

          {isLoadingWorkshops ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[...workshops].sort((a, b) => a.sortOrder - b.sortOrder).map((ws) => {
                const isInCart = items.some(item => item.product.id === ws.id);

                return (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    onClick={() => setSelectedWorkshop(ws)}
                    className="bg-background border border-border-custom rounded-3xl p-8 flex flex-col justify-between hover:shadow-xl transition-all cursor-pointer group"
                  >
                    <div>
                      {/* Categoria */}
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-3 py-1 bg-primary/5 text-primary rounded-full flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-accent" /> Taller {ws.category}
                        </span>
                        <span className="text-xs text-primary/60 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {ws.duration}
                        </span>
                      </div>

                      <h4 className="font-serif text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors">{ws.title}</h4>
                      <p className="text-xs text-primary/75 leading-relaxed font-light mb-6 line-clamp-3">
                        {ws.description}
                      </p>

                      {/* Incluye */}
                      <div className="mb-8">
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
                        className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md bg-primary-solid hover:bg-accent text-white hover:text-primary cursor-pointer"
                      >
                        Ver Ficha Taller
                      </button>
                    </div>
                  </motion.div>
                );
              })}
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
                        categoryBadge: `Taller ${wsToBook.category}`
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
