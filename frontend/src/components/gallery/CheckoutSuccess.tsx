'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Phone, Mail, ArrowLeft } from 'lucide-react';

function getOrderId(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('order_id') ?? '';
}

export default function CheckoutSuccess() {
  const [orderId] = useState<string>(getOrderId);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
      <div className="bg-bg-card border border-border-custom rounded-3xl max-w-lg w-full p-8 sm:p-12 text-center space-y-6 shadow-lg">
        <CheckCircle2 className="w-16 h-16 text-secondary mx-auto" />
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">¡Pedido Recibido!</h1>
          <p className="text-sm text-primary/65 mt-2" suppressHydrationWarning>
            Tu pedido #{orderId} ha sido registrado de forma segura en nuestro sistema de reservas.
          </p>
        </div>
        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-xs text-left leading-relaxed">
          <strong>Siguiente Paso:</strong> Te enviaremos un correo con las instrucciones de pago e
          links de descarga para las fotos y comprobantes del taller.
        </div>
        <div className="text-xs text-primary/60 space-y-1">
          <p className="flex items-center justify-center gap-2">
            <Phone className="w-3.5 h-3.5 shrink-0" /> +51 930 456 857 / +51 966 830 248
          </p>
          <p className="flex items-center justify-center gap-2">
            <Mail className="w-3.5 h-3.5 shrink-0" /> info@beardedmountaineerlodge.com
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-primary-solid text-white text-xs uppercase font-bold tracking-wider px-6 py-3 rounded-full hover:bg-accent hover:text-primary transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
      </div>
    </main>
  );
}