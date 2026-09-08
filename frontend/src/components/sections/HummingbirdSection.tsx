'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentService, resolveImageUrl } from '@/services/content.service';
import { Check, Star, ChevronRight, ChevronLeft, Bird, X, Maximize } from 'lucide-react';
import type { HummingbirdPass } from '@/types';
import { openWhatsApp } from '@/lib/whatsapp';
import { useBookingStore } from '@/store/useBookingStore';
import Image from 'next/image';

export default function HummingbirdSection() {
  const { openBooking } = useBookingStore();
  const { data: passes = [], isLoading } = useQuery({
    queryKey: ['hummingbirdPasses'],
    queryFn: () => ContentService.getHummingbirdPasses()
  });

  const { data: spots = [] } = useQuery({
    queryKey: ['hummingbirdSpots'],
    queryFn: () => ContentService.getHummingbirdSpots()
  });

  const sortedSpots = [...spots].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedPasses = [...passes].sort((a, b) => a.sortOrder - b.sortOrder);
  const [openPass, setOpenPass] = useState<HummingbirdPass | null>(null);
  const [openSpot, setOpenSpot] = useState<number | null>(null);
  const totalSpots = sortedSpots.length;
  const [current, setCurrent] = useState(0);
  const safeCurrent = totalSpots === 0 ? 0 : current % totalSpots;
  const currentSpot = totalSpots === 0 ? undefined : sortedSpots[safeCurrent];

  useEffect(() => {
    if (totalSpots < 2) return;
    const timer = setInterval(() => setCurrent((i) => (i + 1) % totalSpots), 5000);
    return () => clearInterval(timer);
  }, [totalSpots]);

  useEffect(() => {
    if (!openPass && openSpot === null) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpenPass(null);
        setOpenSpot(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPass, openSpot]);

  const goSpot = (delta: number): void => {
    if (openSpot === null || totalSpots === 0) return;
    setOpenSpot((openSpot + delta + totalSpots) % totalSpots);
  };

  const goSlide = (delta: number): void => {
    if (totalSpots === 0) return;
    setCurrent((i) => (i + delta + totalSpots) % totalSpots);
  };

  return (
    <section id="colibries" className="relative w-full py-12 md:py-16 lg:py-20 overflow-hidden border-b border-border-custom">
      {/* Contenedor del Fondo de Imagen con superposición crema */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/Santuario_de_colibries Rem.jpeg"
          alt="Santuario de Colibríes"
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/65 via-background/55 to-background/65" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Encabezado con espaciado optimizado */}
        <div className="text-center max-w-3xl mx-auto mb-6 md:mb-8">
          <span className="text-accent uppercase tracking-widest text-xs font-semibold">Santuario de Colibríes</span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold mt-1 mb-2 text-primary">
            Avistamiento de aves
          </h2>
          <p className="text-primary/75 font-light leading-relaxed text-sm md:text-base">
            Contamos con espacios especialmente diseñados para maximizar tus oportunidades de ver y fotografiar colibríes y otras aves andinas en su hábitat natural.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Escenarios de avistamiento (Card izquierdo) */}
            <div className="lg:col-span-8 xl:col-span-8">
              <div className="relative bg-bg-card/90 backdrop-blur border border-border-custom rounded-2xl shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom/50">
                  <span className="text-accent uppercase tracking-widest text-[10px] font-semibold flex items-center gap-1.5">
                    <Bird className="w-3.5 h-3.5" /> Escenarios
                  </span>
                  <span className="text-[10px] font-bold text-primary/40">{totalSpots}</span>
                </div>

                {/* Navegación lateral */}
                {totalSpots > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Escenario anterior"
                      onClick={() => goSlide(-1)}
                      className="absolute left-3 top-[32%] sm:top-[34%] -translate-y-1/2 z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-bg-card/90 backdrop-blur border border-primary/10 text-primary shadow-md hover:bg-primary-solid hover:text-white transition-all flex items-center justify-center"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Siguiente escenario"
                      onClick={() => goSlide(1)}
                      className="absolute right-3 top-[32%] sm:top-[34%] -translate-y-1/2 z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-bg-card/90 backdrop-blur border border-primary/10 text-primary shadow-md hover:bg-primary-solid hover:text-white transition-all flex items-center justify-center"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <AnimatePresence mode="wait">
                  {currentSpot && (
                    <motion.div
                      key={safeCurrent}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Fotografía completa del escenario (clic para ampliar) */}
                      <button
                        type="button"
                        aria-label={`Ampliar foto de ${currentSpot.title}`}
                        onClick={() => setOpenSpot(safeCurrent)}
                        className="relative h-80 sm:h-96 md:h-[400px] lg:h-[420px] w-full overflow-hidden block cursor-zoom-in text-left group"
                      >
                        {resolveImageUrl(currentSpot.imageUrl) ? (
                          <Image
                            src={resolveImageUrl(currentSpot.imageUrl)}
                            alt={currentSpot.title}
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 66vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <Bird className="w-16 h-16 text-primary/40" />
                          </div>
                        )}

                        {/* Sombra sutil */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                        {/* Badges superiores sobre la imagen */}
                        <span className="absolute top-4 left-4 bg-bg-card/90 backdrop-blur px-2.5 py-1 rounded-full text-[9px] font-bold text-primary uppercase tracking-wider shadow-sm">
                          Escenario {String(safeCurrent + 1).padStart(2, '0')} / {totalSpots}
                        </span>

                        <span className="absolute top-4 right-4 bg-bg-card/90 backdrop-blur w-9 h-9 rounded-full flex items-center justify-center text-primary transition-colors group-hover:bg-accent group-hover:text-primary shadow-sm">
                          <Maximize className="w-4 h-4" />
                        </span>

                        {/* RECUADRO CON BORDE BLANCO Y FONDO OSCURO TRANSPARENTE AL LADO INFERIOR IZQUIERDO */}
                        <div className="absolute bottom-4 left-4 max-w-[92%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[62%] bg-black/10 border border-white/80 rounded-2xl p-4 sm:p-5 shadow-2xl z-10 pointer-events-none">
                          <span className="text-accent uppercase tracking-widest text-[9px] font-bold block mb-1">
                            Punto de Observación • Escenario {String(safeCurrent + 1).padStart(2, '0')}
                          </span>
                          <h3 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight mb-2 drop-shadow-sm">
                            {currentSpot.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-white/90 font-light leading-relaxed line-clamp-3 sm:line-clamp-none">
                            {currentSpot.description}
                          </p>
                        </div>
                      </button>

                      {/* Aspectos destacados / Beneficios con altura fija estricta para evitar cualquier salto visual */}
                      <div className="p-5 sm:p-6 md:p-7 flex flex-col justify-start">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-accent block mb-2.5">
                          Aspectos Destacados & Beneficios:
                        </span>
                        <div className="h-[145px] sm:h-[135px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 content-start">
                            {currentSpot.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-primary/85">
                                <Check className="w-4 h-4 shrink-0 mt-0.5 text-secondary" />
                                <span className="leading-snug">{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Controles del carrusel (Paginación con dots) */}
                <div className="flex items-center justify-between px-6 pb-6">
                  <div className="flex gap-1.5">
                    {sortedSpots.map((spot, i) => (
                      <button
                        key={spot.id}
                        type="button"
                        aria-label={`Ver ${spot.title}`}
                        onClick={() => setCurrent(i)}
                        className={`h-1.5 rounded-full transition-all ${i === safeCurrent ? 'w-8 bg-accent' : 'w-6 bg-primary/20 hover:bg-primary/40'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-primary/40">{safeCurrent + 1} / {totalSpots}</span>
                </div>
              </div>
            </div>

            {/* Listado compacto de pases (derecha) */}
            <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative bg-bg-card/90 backdrop-blur border border-border-custom rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom/50">
                  <span className="text-accent uppercase tracking-widest text-[10px] font-semibold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" /> Pases
                  </span>
                  <span className="text-[10px] font-bold text-primary/40">{sortedPasses.length}</span>
                </div>

                {sortedPasses.map((pass) => (
                  <button
                    key={pass.id}
                    type="button"
                    onClick={() => setOpenPass(pass)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left group transition-colors hover:bg-primary/5 border-b border-border-custom/40 last:border-0 outline-none"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-serif text-sm font-semibold text-primary group-hover:text-terracotta transition-colors truncate">
                        {pass.title}
                      </span>
                      {pass.featured && (
                        <span className="shrink-0 bg-accent text-primary px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider">
                          ★
                        </span>
                      )}
                    </span>
                    <span className="flex items-baseline gap-1.5 shrink-0">
                      {(pass.showPEN ?? true) && (
                        <span className="flex items-baseline gap-0.5">
                          <span className="text-[10px] font-semibold text-primary/50">S/.</span>
                          <span className="font-serif text-sm font-extrabold text-primary">{pass.price}</span>
                        </span>
                      )}
                      {pass.showUSD && pass.priceUSD != null && (
                        <span className="flex items-baseline gap-0.5 text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded text-[11px] font-bold">
                          <span>$</span>
                          <span>{pass.priceUSD}</span>
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </span>
                  </button>
                ))}
              </motion.div>
              <p className="text-[10px] text-primary/50 font-light mt-2 text-center">
                Clic en un pase para ver todos sus beneficios.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Popup / Overlay del pase seleccionado */}
      <AnimatePresence>
        {openPass && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={() => setOpenPass(null)}
          >
            <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              role="dialog"
              aria-modal="true"
              aria-label={openPass.title}
              onClick={(event) => event.stopPropagation()}
              className={`relative w-full max-w-lg rounded-3xl shadow-2xl p-8 max-h-[85vh] overflow-y-auto ${openPass.featured ? 'bg-primary-solid text-white' : 'bg-bg-card text-primary'
                }`}
            >
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpenPass(null)}
                className={`absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${openPass.featured
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-primary/5 text-primary hover:bg-primary/10'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>

              {openPass.featured && (
                <span className="inline-flex items-center gap-1 bg-accent text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                  <Star className="w-3 h-3 fill-primary" /> Recomendado
                </span>
              )}

              <h3 className={`font-serif text-3xl font-bold mb-4 ${openPass.featured ? 'text-white' : 'text-primary'}`}>
                {openPass.title}
              </h3>

              <p className={`text-sm md:text-base leading-relaxed mb-6 ${openPass.featured ? 'text-white/80' : 'text-primary/70'}`}>
                {openPass.description}
              </p>

              <div className="flex flex-wrap items-baseline gap-3 mb-8">
                {(openPass.showPEN ?? true) && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-serif">S/.</span>
                    <span className="text-4xl md:text-5xl font-extrabold font-serif tracking-tight">{openPass.price}</span>
                    <span className={`text-xs ml-1 ${openPass.featured ? 'text-white/60' : 'text-primary/50'}`}>PEN</span>
                  </div>
                )}
                {openPass.showUSD && openPass.priceUSD != null && (
                  <div className="flex items-baseline gap-1 bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-xl border border-emerald-500/30">
                    <span className="text-xl font-bold font-serif">$</span>
                    <span className="text-3xl md:text-4xl font-extrabold font-serif tracking-tight">{openPass.priceUSD}</span>
                    <span className="text-xs ml-1 font-semibold">USD</span>
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {openPass.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${openPass.featured ? 'text-accent' : 'text-secondary'}`} />
                    <span className={openPass.featured ? 'text-white/95' : 'text-primary/85'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`w-full py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border shadow-lg cursor-pointer ${openPass.featured
                  ? 'bg-accent border-accent text-primary hover:bg-white hover:border-white'
                  : 'border-primary/20 text-primary hover:bg-primary-solid hover:text-white hover:border-primary-solid'
                  }`}
                onClick={() => {
                  const passToBook = openPass;
                  setOpenPass(null);
                  openBooking({
                    serviceType: 'PASE',
                    serviceId: passToBook.id,
                    serviceTitle: passToBook.title,
                    unitPricePEN: Number(passToBook.price),
                    unitPriceUSD: passToBook.priceUSD ? Number(passToBook.priceUSD) : null,
                    categoryBadge: 'Pase Santuario'
                  });
                }}
              >
                Reservar Pase vía Yape / WhatsApp
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visor de imagen ampliada del escenario */}
      <AnimatePresence>
        {openSpot !== null && sortedSpots[openSpot] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-sm"
            onClick={() => setOpenSpot(null)}
          >
            <div className="absolute top-0 inset-x-0 flex items-center justify-between p-5 z-10">
              <span className="text-white/80 text-xs uppercase tracking-widest font-semibold">
                {sortedSpots[openSpot].title} · {openSpot + 1} / {sortedSpots.length}
              </span>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpenSpot(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <motion.div
              key={openSpot}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-5xl max-h-[80vh] flex items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              {resolveImageUrl(sortedSpots[openSpot].imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImageUrl(sortedSpots[openSpot].imageUrl)}
                  alt={sortedSpots[openSpot].title}
                  className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <div className="w-full h-72 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                  <Bird className="w-20 h-20 text-white/50" />
                </div>
              )}
            </motion.div>

            {sortedSpots.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Escenario anterior"
                  onClick={(event) => { event.stopPropagation(); goSpot(-1); }}
                  className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors z-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Siguiente escenario"
                  onClick={(event) => { event.stopPropagation(); goSpot(1); }}
                  className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors z-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}