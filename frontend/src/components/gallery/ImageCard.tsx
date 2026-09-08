'use client';

import React from 'react';
import { PhotoProduct } from '@/types';
import { useCartStore } from '@/store/cart-store';
import { Eye, ShoppingCart, Check } from 'lucide-react';
import Image from 'next/image';

interface ImageCardProps {
  photo: PhotoProduct;
  onViewDetails: (photo: PhotoProduct) => void;
  onOpenCart: () => void;
}

export default function ImageCard({ photo, onViewDetails, onOpenCart }: ImageCardProps) {
  const { items, addItem } = useCartStore();
  const isInCart = items.some(item => item.product.id === photo.id);

  return (
    <div className="group relative bg-bg-card border border-border-custom rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      {/* Imagen */}
      <div className="relative h-64 w-full bg-primary/10 overflow-hidden">
        <Image
          src={photo.imageUrl}
          alt={photo.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Acciones flotantes en Hover */}
        <div className="absolute inset-0 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={() => onViewDetails(photo)}
            className="p-3 rounded-full bg-bg-card text-primary hover:bg-accent hover:text-primary transition-all shadow-md"
            title="Ver detalles y metadatos"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Información de la Foto */}
      <div className="p-6">
        <span className="text-[9px] uppercase tracking-wider font-bold text-accent">
          {photo.metadata.species || 'Paisaje del Lodge'}
        </span>
        <h4 className="font-serif text-lg font-bold text-primary mb-1 mt-1 truncate">
          {photo.title}
        </h4>
        <p className="text-xs text-primary/60 font-light truncate mb-4">
          {photo.metadata.location}
        </p>

        {/* Footer: Precio y Botón de Carrito */}
        <div className="border-t border-border-custom/50 pt-4 flex justify-between items-center">
          <div>
            <span className="text-[9px] text-primary/50 block uppercase tracking-wider">Licencia Digital</span>
            <span className="text-lg font-serif font-bold text-primary">S/. {photo.price} <span className="text-xs font-sans font-normal text-primary/60">PEN</span></span>
          </div>

          <button
            onClick={() => {
              if (isInCart) {
                onOpenCart();
              } else {
                addItem(photo);
                onOpenCart();
              }
            }}
            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              isInCart 
                ? 'bg-secondary text-white border border-secondary' 
                : 'bg-primary-solid text-white hover:bg-accent hover:text-primary'
            }`}
          >
            {isInCart ? (
              <>
                <Check className="w-3.5 h-3.5" /> En Carrito
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" /> Comprar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
