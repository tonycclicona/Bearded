'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContentService } from '@/services/content.service';
import { useCartStore } from '@/store/cart-store';
import { ArrowLeft, Camera, MapPin, Bird, Maximize, ShoppingCart, Check, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

export default function PhotoDetailClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  // Zustand
  const { items, addItem } = useCartStore();

  // Consulta del Producto Fotográfico
  const { data: photo, isLoading } = useQuery({
    queryKey: ['photo', slug],
    queryFn: () => ContentService.getPhotoBySlug(slug),
    enabled: slug !== 'checkout-success'
  });

  const isInCart = photo ? items.some(item => item.product.id === photo.id) : false;

  // Si es la página de checkout success
  if (slug === 'checkout-success') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center py-20 px-6 font-sans">
        <div className="bg-bg-card border border-border-custom max-w-lg w-full rounded-3xl p-8 sm:p-12 text-center shadow-lg space-y-8">
          <CheckCircle2 className="w-20 h-20 text-secondary mx-auto animate-pulse" />
          
          <div className="space-y-3">
            <h1 className="font-serif text-3xl font-bold text-primary">¡Pedido Confirmado!</h1>
            <p className="text-sm text-primary/70">
              Gracias por tu compra. Tu orden de pago ha sido registrada correctamente.
            </p>
            {orderId && (
              <div className="inline-block bg-background border border-border-custom px-4 py-2 rounded-full text-xs font-bold text-primary">
                ID de Orden: #{orderId}
              </div>
            )}
          </div>

          <div className="border-t border-b border-border-custom/60 py-6 text-left text-xs leading-relaxed space-y-4">
            <h3 className="font-bold text-primary text-center">Instrucciones de Descarga e Inscripción</h3>
            <p className="text-primary/75">
              1. <strong>Pago por Transferencia:</strong> Envíanos el comprobante de tu transferencia bancaria a nuestro correo o número de WhatsApp (+51 930 455 857) haciendo referencia a tu ID de Orden.
            </p>
            <p className="text-primary/75">
              2. <strong>Habilitación:</strong> Una vez verificado el pago, recibirás un correo electrónico con los links de descarga en alta resolución de las fotos compradas y/o el ticket digital de acceso para los talleres fotográficos.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center w-full bg-primary-solid hover:bg-accent text-white hover:text-primary py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
          >
            Volver a la Página Principal
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="font-serif text-3xl font-bold text-primary">Fotografía no encontrada</h2>
        <p className="text-sm text-primary/65">El recurso que buscas no existe o fue movido.</p>
        <Link href="/" className="text-accent underline text-sm font-semibold">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background py-16 px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Botón Volver */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary/75 hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a la Landing
        </Link>

        {/* Bloque Detalle */}
        <div className="bg-bg-card border border-border-custom rounded-3xl overflow-hidden shadow-sm flex flex-col lg:flex-row">
          {/* Imagen Visual */}
          <div className="relative lg:w-3/5 h-80 sm:h-[450px] lg:h-[600px] bg-black">
            <Image
              src={photo.imageUrl}
              alt={photo.title}
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Panel Lateral */}
          <div className="lg:w-2/5 p-8 sm:p-12 flex flex-col justify-between bg-background border-t lg:border-t-0 lg:border-l border-border-custom">
            <div className="space-y-8">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-accent">Detalle de Producto</span>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-primary mt-1">{photo.title}</h1>
                <p className="text-sm text-primary/75 font-light leading-relaxed mt-4">{photo.description}</p>
              </div>

              {/* Especificaciones de Cámara */}
              <div className="border-t border-b border-border-custom/60 py-6 space-y-4">
                <h4 className="text-xs uppercase font-bold text-primary/50 tracking-wider">Metadatos Expositivos (EXIF)</h4>
                
                {photo.metadata.species && (
                  <div className="flex items-center gap-3 text-xs text-primary/80">
                    <Bird className="w-4 h-4 text-accent shrink-0" />
                    <span>Especie: <strong className="font-semibold">{photo.metadata.species}</strong></span>
                  </div>
                )}

                {photo.metadata.location && (
                  <div className="flex items-center gap-3 text-xs text-primary/80">
                    <MapPin className="w-4 h-4 text-accent shrink-0" />
                    <span>Localización: <strong className="font-semibold">{photo.metadata.location}</strong></span>
                  </div>
                )}

                {photo.metadata.camera && (
                  <div className="flex items-center gap-3 text-xs text-primary/80">
                    <Camera className="w-4 h-4 text-accent shrink-0" />
                    <span>Cámara: <strong className="font-semibold">{photo.metadata.camera}</strong></span>
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

            {/* Compra */}
            <div className="pt-8 border-t border-border-custom/60 flex flex-col sm:flex-row gap-4 items-center justify-between mt-8">
              <div>
                <span className="text-[10px] text-primary/50 block uppercase tracking-wider">Descarga Digital en Alta</span>
                <span className="text-3xl font-serif font-bold text-primary">S/. {photo.price} <span className="text-xs font-sans font-normal text-primary/60">PEN</span></span>
              </div>

              <button
                onClick={() => {
                  if (!isInCart) {
                    addItem(photo);
                  }
                  alert('Foto agregada al carrito. Puedes proceder al pago abriendo el carrito en la página principal.');
                }}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  isInCart 
                    ? 'bg-secondary text-white' 
                    : 'bg-primary-solid text-white hover:bg-accent hover:text-primary'
                }`}
              >
                {isInCart ? (
                  <>
                    <Check className="w-4 h-4" /> Listo en Carrito
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" /> Agregar al Carrito
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
