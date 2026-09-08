'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { WHATSAPP_NUMBERS, WhatsAppTopic, openWhatsApp } from '@/lib/whatsapp';

export default function WhatsAppBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState(WHATSAPP_NUMBERS[0].phone);
  const [customMessage, setCustomMessage] = useState('');

  const quickTopics: { id: WhatsAppTopic; label: string; icon: string; desc: string }[] = [
    {
      id: 'PASE',
      label: 'Reserva de Pases Diarios',
      icon: '🎫',
      desc: 'Santuario de Colibríes en San Salvador'
    },
    {
      id: 'LODGE',
      label: 'Reserva de Cabañas & Lodge',
      icon: '🛏️',
      desc: 'Habitaciones rústicas con vista a la montaña'
    },
    {
      id: 'TALLER',
      label: 'Inscripción a Talleres de Fotografía',
      icon: '🎓',
      desc: 'Bioacústica, aves y fotografía en Cusco'
    },
    {
      id: 'TOUR_GIS',
      label: 'Rutas GIS & Expediciones con Guías',
      icon: '🗺️',
      desc: 'Avistamiento en las 3 macro-rutas de Perú'
    }
  ];

  const handleQuickTopic = (topic: WhatsAppTopic) => {
    openWhatsApp(topic, undefined, selectedPhone);
    setIsOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMessage.trim()) return;
    openWhatsApp('GENERAL', { customMessage }, selectedPhone);
    setCustomMessage('');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* VENTANA EMERGENTE DE CHAT WHATSAPP */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.92 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mb-4 w-[340px] sm:w-[380px] bg-bg-card border border-border-custom rounded-3xl shadow-2xl overflow-hidden text-primary"
          >
            {/* Header del Chat */}
            <div className="bg-primary-solid text-white p-4 relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full bg-[#25D366]/20 border border-[#25D366] flex items-center justify-center text-lg">
                  🦅
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25D366] border-2 border-primary-solid rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-white">
                    Bearded Mountaineer
                  </h3>
                  <p className="text-[10px] text-accent font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" /> En línea • Atención Inmediata
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cerrar ventana de WhatsApp"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Asesor / Número */}
            <div className="p-3 bg-primary/5 border-b border-border-custom/60 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary/60 block px-1">
                Selecciona Asesor:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {WHATSAPP_NUMBERS.map((num) => (
                  <button
                    key={num.id}
                    onClick={() => setSelectedPhone(num.phone)}
                    className={`px-2.5 py-1.5 rounded-xl text-left text-[11px] font-semibold transition-all border ${
                      selectedPhone === num.phone
                        ? 'bg-primary-solid text-white border-primary shadow-sm'
                        : 'bg-background text-primary/70 border-border-custom hover:border-accent'
                    }`}
                  >
                    <div className="font-bold truncate">{num.label}</div>
                    <div className="text-[9px] opacity-80">{num.display}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones Rápidas Dinámicas */}
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary/60 block mb-1">
                ¿Qué deseas consultar?
              </span>

              {quickTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleQuickTopic(topic.id)}
                  className="w-full bg-background hover:bg-primary/5 border border-border-custom hover:border-accent p-2.5 rounded-2xl text-left transition-all flex items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{topic.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-primary group-hover:text-accent transition-colors">
                        {topic.label}
                      </div>
                      <div className="text-[10px] text-primary/60 line-clamp-1">
                        {topic.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>

            {/* Caja de Consulta Personalizada */}
            <div className="p-4 border-t border-border-custom/60 bg-background/50">
              <form onSubmit={handleCustomSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe tu consulta personalizada..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border-custom rounded-xl text-xs focus:ring-2 focus:ring-[#25D366] focus:outline-none placeholder:text-primary/40"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl transition-all shrink-0 shadow-md flex items-center justify-center"
                  aria-label="Enviar a WhatsApp"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <span className="text-[9px] text-primary/40 block text-center mt-2">
                Redirección instantánea a WhatsApp oficial de Bearded Mountaineer
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÓN FLOTANTE PRINCIPAL (BURBUJA DE WHATSAPP) */}
      <div className="relative group">
        {/* Tooltip flotante */}
        {!isOpen && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block whitespace-nowrap">
            <div className="bg-primary-solid text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-xl border border-white/10 flex items-center gap-1.5">
              <span>¿Consultas o Reservas? Chatea con nosotros</span>
              <span className="text-[#25D366]">💬</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200"
          aria-label="Abrir chat de WhatsApp"
        >
          {/* Efecto de Pulso continuo */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25 pointer-events-none" />

          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <svg
              className="w-7 h-7 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
