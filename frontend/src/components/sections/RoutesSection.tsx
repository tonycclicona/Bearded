'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentService } from '@/services/content.service';
import type { Tour } from '@/types';
import { useBookingStore } from '@/store/useBookingStore';
import { Map, Clock, Compass, AlertCircle, Users, Check, X, Shield, Camera, Eye, Footprints, Sparkles } from 'lucide-react';

export default function RoutesSection() {
  const [selectedRegion, setSelectedRegion] = useState<string>('TODAS');
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const { openBooking } = useBookingStore();

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['toursExpediciones'],
    queryFn: () => ContentService.getTours()
  });

  const filteredTours = tours.filter((tour) => {
    if (selectedRegion === 'TODAS') return true;
    return tour.regionRuta.toLowerCase().includes(selectedRegion.toLowerCase());
  });

  const parseServices = (raw: string | undefined): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not JSON
    }
    return raw.split('\n').filter(Boolean);
  };

  return (
    <section id="rutas" className="py-20 md:py-28 bg-bg-card border-b border-border-custom relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-6">
          <div className="max-w-2xl">
            <span className="text-accent uppercase tracking-widest text-xs font-semibold flex items-center gap-1.5 mb-2">
              <Compass className="w-4 h-4 text-accent" /> Expediciones Guiadas
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-primary">
              Rutas & Expediciones de Avistamiento
            </h2>
            <p className="text-primary/75 font-light leading-relaxed mt-2 text-sm md:text-base">
              Paquetes de campo diseñados para ornitólogos, fotógrafos de naturaleza y amantes de la biodiversidad en las 3 macro-rutas de aves de Perú.
            </p>
          </div>

          {/* Filtros por Macro-Ruta */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'TODAS', label: 'Todas' },
              { id: 'Norte', label: 'Ruta Norte' },
              { id: 'Centro', label: 'Ruta Centro' },
              { id: 'Sur', label: 'Ruta Sur' }
            ].map((reg) => (
              <button
                key={reg.id}
                onClick={() => setSelectedRegion(reg.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                  selectedRegion === reg.id
                    ? 'bg-primary-solid text-white border-primary shadow-sm'
                    : 'bg-background text-primary/70 border-border-custom hover:text-primary'
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listado de Tours */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredTours.map((tour, index) => {
              const includedList = parseServices(tour.servicios_incluidos);

              return (
                <motion.div
                  key={tour.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="bg-background border border-border-custom hover:border-accent rounded-3xl p-7 flex flex-col justify-between hover:shadow-xl transition-all"
                >
                  <div>
                    {/* Header de la card */}
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-accent/15 text-accent">
                        {tour.regionRuta}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-primary/70 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-secondary" />
                        <span>{tour.duracion_dias} Días</span>
                      </div>
                    </div>

                    <h3 className="font-serif text-2xl font-bold text-primary mb-3">
                      {tour.nombre}
                    </h3>
                    
                    <p className="text-xs text-primary/75 font-light leading-relaxed mb-6 line-clamp-3">
                      {tour.descripcion}
                    </p>

                    {/* Meta info */}
                    <div className="space-y-2.5 mb-6 border-t border-border-custom/60 pt-4 text-xs text-primary/75">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-primary/60">
                          <Footprints className="w-3.5 h-3.5 text-secondary" /> Dificultad:
                        </span>
                        <strong className="font-semibold text-primary">{tour.nivelCaminata}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-primary/60">
                          <Users className="w-3.5 h-3.5 text-secondary" /> Cupos:
                        </span>
                        <span className="font-semibold text-primary">Máx. {tour.cupos_disponibles} personas</span>
                      </div>
                      {tour.hotspots && tour.hotspots.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium text-primary/60">
                            <Map className="w-3.5 h-3.5 text-secondary" /> Hotspots:
                          </span>
                          <span className="font-semibold text-primary">{tour.hotspots.length} puntos GIS</span>
                        </div>
                      )}
                    </div>

                    {/* Inclusiones destacadas */}
                    {includedList.length > 0 && (
                      <div className="mb-6 space-y-1.5 bg-bg-card p-3 rounded-xl border border-border-custom/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block">Incluye:</span>
                        {includedList.slice(0, 3).map((inc, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-primary/80">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{inc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer de la card: Precio y Botón */}
                  <div className="border-t border-border-custom/60 pt-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Inversión por adulto</span>
                      <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                        {(tour.showPEN ?? true) && (
                          <span className="text-xl sm:text-2xl font-serif font-bold text-primary">
                            S/. {Number(tour.precio_adulto).toFixed(2)} <span className="text-xs font-sans font-normal text-primary/60">PEN</span>
                          </span>
                        )}
                        {tour.showUSD && tour.precio_adulto_usd != null && (
                          <span className={`font-serif font-bold ${!(tour.showPEN ?? true) ? 'text-xl sm:text-2xl text-primary' : 'text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200'}`}>
                            ${Number(tour.precio_adulto_usd).toFixed(2)} <span className="text-[10px] font-sans font-normal text-emerald-700">USD</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTour(tour)}
                      className="bg-primary-solid hover:bg-accent hover:text-primary text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-full transition-all shadow-md whitespace-nowrap cursor-pointer"
                    >
                      Ver Itinerario
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Tip de Seguridad */}
        <div className="mt-14 bg-primary/5 border border-primary/15 rounded-2xl p-6 flex gap-4 items-start max-w-4xl mx-auto">
          <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-primary/80">
            <strong>Recomendación Ornitológica & Altitud:</strong> Para las expediciones clasificadas como <em>Moderadas</em> o <em>Exigentes</em> (Abra Málaga, Unchog o Manu), recomendamos llegar con 24 a 48 horas de anticipación a la ciudad base para aclimatación. Todos nuestros tours cuentan con botiquín de campo y biólogos especializados.
          </p>
        </div>
      </div>

      {/* MODAL DE DETALLE Y RESERVA DEL TOUR */}
      <AnimatePresence>
        {selectedTour && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-border-custom rounded-3xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 relative text-primary"
            >
              <button
                onClick={() => setSelectedTour(null)}
                className="absolute top-5 right-5 p-1 rounded-full text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-accent/20 text-accent inline-block mb-2">
                  {selectedTour.regionRuta} • {selectedTour.duracion_dias} Días
                </span>
                <h3 className="font-serif text-2xl md:text-3xl font-bold">
                  {selectedTour.nombre}
                </h3>
                <p className="text-sm text-primary/75 mt-2 font-light leading-relaxed">
                  {selectedTour.descripcion}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3 p-3 rounded-xl bg-background border border-border-custom text-xs">
                  <span className="text-[10px] text-primary/50 uppercase tracking-wider font-semibold">Inversión:</span>
                  {(selectedTour.showPEN ?? true) && (
                    <span className="font-serif font-bold text-base text-primary">
                      S/. {Number(selectedTour.precio_adulto).toFixed(2)} <span className="text-[10px] font-sans font-normal text-primary/60">PEN</span>
                    </span>
                  )}
                  {selectedTour.showUSD && selectedTour.precio_adulto_usd != null && (
                    <span className={`font-serif font-bold ${!(selectedTour.showPEN ?? true) ? 'text-base text-primary' : 'text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200'}`}>
                      ${Number(selectedTour.precio_adulto_usd).toFixed(2)} <span className="text-[10px] font-sans font-normal text-emerald-700">USD</span>
                    </span>
                  )}
                  <span className="text-[10px] text-primary/50">por adulto</span>
                </div>
              </div>

              {/* Itinerario */}
              {selectedTour.itinerario && (
                <div className="space-y-2 bg-background p-4 rounded-2xl border border-border-custom">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Itinerario de Campo
                  </h4>
                  <p className="text-xs leading-relaxed text-primary/80 whitespace-pre-line">
                    {selectedTour.itinerario}
                  </p>
                </div>
              )}

              {/* Equipo Óptico */}
              {selectedTour.equipoOpticoReq && (
                <div className="space-y-1 bg-background p-4 rounded-2xl border border-border-custom text-xs">
                  <span className="font-bold text-accent uppercase tracking-wider block text-[10px]">
                    🔭 Equipo Óptico Recomendado:
                  </span>
                  <span className="text-primary/80">{selectedTour.equipoOpticoReq}</span>
                </div>
              )}

              {/* Botón de Reserva con Yape & Asistentes */}
              <div className="border-t border-border-custom pt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    const tourToBook = selectedTour;
                    setSelectedTour(null);
                    openBooking({
                      serviceType: 'TOUR',
                      serviceId: String(tourToBook.id),
                      serviceTitle: tourToBook.nombre,
                      unitPricePEN: Number(tourToBook.precio_adulto),
                      unitPriceUSD: tourToBook.precio_adulto_usd ? Number(tourToBook.precio_adulto_usd) : null,
                      maxGuests: tourToBook.cupos_disponibles || 10,
                      categoryBadge: tourToBook.regionRuta || 'Expedición Ornitológica'
                    });
                  }}
                  className="w-full bg-[#6F1D7E] hover:bg-[#581564] text-white py-4 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Reservar Expedición & Pago Yape</span>
                </button>
                <p className="text-[11px] text-center text-primary/60 font-light">
                  Podrás elegir la fecha, registrar los datos de todos los asistentes y adjuntar tu comprobante por WhatsApp.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
