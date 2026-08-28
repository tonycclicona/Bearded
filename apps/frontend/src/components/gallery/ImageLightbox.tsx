'use client';

import React from 'react';
import { PhotoProduct } from '@/types';
import { useCartStore } from '@/store/cart-store';
import { X, Camera, MapPin, Maximize, Bird, ShoppingCart, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImageLightboxProps {
  photo: PhotoProduct;
  onClose: () => void;
  onOpenCart: () => void;
}

export default function ImageLightbox({ photo, onClose, onOpenCart }: ImageLightboxProps) {
  const { items, addItem } = useCartStore();
  const isInCart = items.some(item => item.product.id === photo.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      {/* Botón de Cerrar */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Cerrar modal"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Contenedor Principal */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-bg-card rounded-3xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row shadow-2xl"
      >
        {/* Imagen Visual */}
        <div className="relative md:w-3/5 h-64 sm:h-96 md:h-[550px] bg-black flex items-center justify-center">
          <img 
            src={photo.imageUrl} 
            alt={photo.title}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Panel de Metadatos y Compra */}
        <div className="md:w-2/5 p-8 flex flex-col justify-between bg-background">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-accent">Detalle de Fotografía</span>
              <h3 className="font-serif text-3xl font-bold text-primary mt-1">{photo.title}</h3>
              <p className="text-sm text-primary/75 font-light leading-relaxed mt-2">{photo.description}</p>
            </div>

            {/* Metadatos EXIF / Especificaciones */}
            <div className="border-t border-b border-border-custom/60 py-5 space-y-4">
              <h4 className="text-xs uppercase font-bold text-primary/50 tracking-wider">Metadatos de Captura</h4>
              
              {photo.metadata.species && (
                <div className="flex items-center gap-3 text-xs text-primary/80">
                  <Bird className="w-4 h-4 text-accent shrink-0" />
                  <span>Especie: <strong className="font-semibold">{photo.metadata.species}</strong></span>
                </div>
              )}

              {photo.metadata.location && (
                <div className="flex items-center gap-3 text-xs text-primary/80">
                  <MapPin className="w-4 h-4 text-accent shrink-0" />
                  <span>Ubicación: <strong className="font-semibold">{photo.metadata.location}</strong></span>
                </div>
              )}

              {photo.metadata.camera && (
                <div className="flex items-center gap-3 text-xs text-primary/80">
                  <Camera className="w-4 h-4 text-accent shrink-0" />
                  <span>Cámara y Lente: <strong className="font-semibold">{photo.metadata.camera}</strong></span>
                </div>
              )}

              {photo.metadata.resolution && (
                <div className="flex items-center gap-3 text-xs text-primary/80">
                  <Maximize className="w-4 h-4 text-accent shrink-0" />
                  <span>Resolución: <strong className="font-semibold">{photo.metadata.resolution}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Precio y CTA de Compra */}
          <div className="pt-6 border-t border-border-custom/60 flex flex-col sm:flex-row gap-4 items-center justify-between mt-6">
            <div>
              <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Licencia de Uso Digital</span>
              <span className="text-3xl font-serif font-bold text-primary">S/. {photo.price} <span className="text-xs font-sans font-normal text-primary/60">PEN</span></span>
            </div>

            <button
              onClick={() => {
                if (isInCart) {
                  onClose();
                  onOpenCart();
                } else {
                  addItem(photo);
                  onClose();
                  onOpenCart();
                }
              }}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                isInCart 
                  ? 'bg-secondary text-white' 
                  : 'bg-primary-solid text-white hover:bg-accent hover:text-primary'
              }`}
            >
              {isInCart ? (
                <>
                  <Check className="w-4 h-4" /> En Carrito
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" /> Comprar Descarga
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
