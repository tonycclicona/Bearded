'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContentService, resolveImageUrl } from '@/services/content.service';
import type { Guia } from '@/types';
import { ShieldCheck, Languages, Award, Compass, Star } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function GuidesSection() {
  const { data: guias = [], isLoading } = useQuery({
    queryKey: ['guiasOrnitologos'],
    queryFn: () => ContentService.getGuias()
  });

  return (
    <section id="guias" className="py-20 md:py-28 bg-background border-b border-border-custom relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ENCABEZADO */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-accent uppercase tracking-widest text-xs font-semibold flex items-center justify-center gap-1.5 mb-2">
            <Award className="w-4 h-4 text-accent" /> Especialistas en Aves y Naturaleza
          </span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-primary">
            Guías de Birdwatching & Fotografía
          </h2>
          <p className="text-primary/75 font-light leading-relaxed mt-3 text-sm md:text-base">
            Nuestro equipo acompaña experiencias de observación de aves, aportando conocimiento de campo, identificación de especies, comportamiento y ecosistemas del Perú.
          </p>
        </div>

        {/* LISTADO DE GUÍAS */}
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {guias.map((guia, index) => (
              <motion.div
                key={guia.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="bg-bg-card border border-border-custom hover:border-accent rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Foto de perfil */}
                  <div className="relative w-28 h-28 mx-auto mb-5 rounded-full overflow-hidden border-4 border-accent/30 shadow-md">
                    <Image
                      src={resolveImageUrl(guia.foto)}
                      alt={guia.nombre}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="text-center mb-4">
                    <h3 className="font-serif text-xl font-bold text-primary">
                      {guia.nombre}
                    </h3>
                    <p className="text-xs font-semibold text-accent mt-0.5">
                      {guia.especialidad}
                    </p>
                  </div>

                  <p className="text-xs text-primary/75 font-light leading-relaxed mb-6 text-center">
                    {guia.descripcion}
                  </p>
                </div>

                {/* Meta info */}
                <div className="border-t border-border-custom/60 pt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-primary/70">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Compass className="w-3.5 h-3.5 text-secondary" /> Experiencia:
                    </span>
                    <strong className="text-primary font-bold">{guia.experiencia}</strong>
                  </div>
                  <div className="flex items-center justify-between text-primary/70">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Languages className="w-3.5 h-3.5 text-secondary" /> Idiomas:
                    </span>
                    <span className="text-primary font-semibold">{guia.idiomas}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
