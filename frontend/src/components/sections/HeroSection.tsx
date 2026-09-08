'use client';

import React, { useState, useEffect } from 'react';
import { useScroll, useTransform, motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ContentService, resolveImageUrl } from '@/services/content.service';
import type { EspecieColibri } from '@/types';
import { Phone, Mail, MapPin, ChevronDown, Sparkles, Bird } from 'lucide-react';
import Image from 'next/image';

const ORIGINAL_HERO_SLIDE = {
  id: 'hero-original',
  nombreComun: 'Santuario Bearded Mountaineer',
  nombreCientifico: 'San Salvador, Cusco • Hábitat Natural',
  fotoPrincipal: '/hero-1.jpg',
  departamento: 'Cusco • Perú'
};

const DEFAULT_SLIDES = [
  ORIGINAL_HERO_SLIDE,
  {
    id: 1,
    nombreComun: 'Colibrí Cola de Espátula',
    nombreCientifico: 'Loddigesia mirabilis',
    fotoPrincipal: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=1920&q=85',
    departamento: 'Amazonas • Huembo'
  },
  {
    id: 2,
    nombreComun: 'Colibrí Pico Espada',
    nombreCientifico: 'Ensifera ensifera',
    fotoPrincipal: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1920&q=85',
    departamento: 'Cusco • San Salvador'
  },
  {
    id: 3,
    nombreComun: 'Colibrí Noble del Valle Sagrado',
    nombreCientifico: 'Oreonympha nobilis',
    fotoPrincipal: 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?auto=format&fit=crop&w=1920&q=85',
    departamento: 'Valle Sagrado de los Incas'
  },
  {
    id: 4,
    nombreComun: 'Rayo de Sol Brillante',
    nombreCientifico: 'Aglaeactis cupripennis',
    fotoPrincipal: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=1920&q=85',
    departamento: 'Bosque Nuboso de Carpish'
  }
];

export default function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], ['0%', '-18%']);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Consultar el catálogo de colibríes desde la API
  const { data: especies = [] } = useQuery({
    queryKey: ['colibriesHeroSlides'],
    queryFn: () => ContentService.getEspeciesColibries(),
    staleTime: 1000 * 60 * 5 // 5 minutos
  });

  // Combinar la imagen original del santuario con todas las imágenes del catálogo
  const catalogSlides = especies.filter((e) => Boolean(e.fotoPrincipal));
  const slides = catalogSlides.length > 0
    ? [ORIGINAL_HERO_SLIDE, ...catalogSlides]
    : DEFAULT_SLIDES;

  const currentSlide = slides[activeSlideIndex % slides.length] || ORIGINAL_HERO_SLIDE;

  // Rotación automática de imágenes cada 6 segundos
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section
      id="inicio"
      className="relative min-h-screen w-full flex flex-col justify-between items-center overflow-hidden"
    >
      {/* FONDO DINÁMICO CON PARALLAX Y TRANSICIÓN SUAVE ENTRE LA FOTO ORIGINAL Y LAS DEL CATÁLOGO */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 h-[120%] w-full -z-10 bg-black"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id || activeSlideIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full"
          >
            <Image
              src={resolveImageUrl(currentSlide.fotoPrincipal)}
              alt={currentSlide.nombreComun || 'Santuario de Colibríes Bearded Mountaineer'}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center brightness-90"
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradiente multicapa para contraste y legibilidad óptima */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E2C22]/65 via-[#1E2C22]/55 to-[#0B110D]/95" />
      </motion.div>

      {/* Espaciador para la barra de navegación fija */}
      <div className="h-24 sm:h-28 w-full z-10" />

      {/* CONTENIDO CENTRAL */}
      <div className="max-w-4xl px-6 text-center z-10 flex flex-col items-center justify-center flex-grow py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {/* Logo Oficial */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-5 flex items-center justify-center bg-bg-card/95 backdrop-blur rounded-full p-3 border-2 border-accent/40 shadow-2xl hover:scale-105 transition-transform duration-300">
            <div className="relative w-full h-full">
              <Image
                src="/logo_BEARDEDMOUNTANIER.png"
                alt="Logo Oficial Bearded Mountaineer"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <span className="text-accent uppercase tracking-widest text-xs sm:text-sm font-semibold mb-1">
            Santuario de Aves Andinas
          </span>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight mb-2">
            Bearded Mountaineer
          </h1>
          <p className="font-serif text-accent text-lg sm:text-xl md:text-2xl tracking-widest uppercase mb-5">
            Sacred Garden & Lodge
          </p>

          <p className="text-white/85 max-w-xl text-sm sm:text-base md:text-lg font-light leading-relaxed mb-8">
            Un espacio dedicado al avistamiento y la fotografía de aves en los Andes del Cusco, rodeado de naturaleza y hábitat para especies andinas.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
            <a
              href="#taxonomia"
              className="bg-accent hover:bg-accent/90 text-primary font-bold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-xl text-center"
            >
              Explorar Aves
            </a>
            <a
              href="#mapa-gis"
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all text-center backdrop-blur"
            >
              Ver Rutas de Avistamiento
            </a>
          </div>
        </motion.div>
      </div>

      {/* FOOTER DEL HERO CON DATOS Y BADGE DE FONDO EN VIVO */}
      <div className="w-full max-w-7xl mx-auto px-6 py-6 z-10 text-white/90 border-t border-white/15 flex flex-col md:flex-row gap-4 justify-between items-center text-xs">

        {/* Badge de la Imagen/Especie en Fondo */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/15 px-3.5 py-1.5 rounded-full">
          <Bird className="w-3.5 h-3.5 text-accent animate-pulse" />
          <span className="text-white/70">En fondo:</span>
          <strong className="text-accent font-serif">{currentSlide.nombreComun}</strong>
          {currentSlide.nombreCientifico && (
            <span className="text-white/50 italic hidden sm:inline">({currentSlide.nombreCientifico})</span>
          )}
        </div>

        {/* Datos de Contacto */}
        <div className="flex flex-wrap gap-4 sm:gap-6 items-center justify-center text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 text-white/80">
            <MapPin className="text-accent w-3.5 h-3.5 shrink-0" />
            <span>San Salvador – Cusco, Perú</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/80">
            <Phone className="text-accent w-3.5 h-3.5 shrink-0" />
            <span>+51 930 455 857</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/80 hidden lg:flex">
            <Mail className="text-accent w-3.5 h-3.5 shrink-0" />
            <span>info@beardedmountaineerlodge.com</span>
          </div>
        </div>

        {/* Indicadores de Diapositiva & Flecha Scroll */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlideIndex(idx)}
                aria-label={`Ver foto ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-500 ${activeSlideIndex === idx
                  ? 'w-5 bg-accent shadow-sm'
                  : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
              />
            ))}
          </div>

          <a
            href="#taxonomia"
            aria-label="Deslizar hacia abajo al catálogo"
            className="animate-bounce p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-accent" />
          </a>
        </div>
      </div>
    </section>
  );
}
