'use client';

import React, { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Users,
  User,
  Phone,
  Mail,
  CreditCard,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Send,
  AlertCircle
} from 'lucide-react';
import { useBookingStore } from '@/store/useBookingStore';
import { Booking } from '@/types';

export const BookingModal: React.FC = () => {
  const { isOpen, params, closeBooking } = useBookingStore();

  const [step, setStep] = useState<'FORM' | 'SUCCESS'>('FORM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [selectedCurrency, setSelectedCurrency] = useState<'PEN' | 'USD'>('PEN');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(1);
  const [primaryName, setPrimaryName] = useState<string>('');
  const [primaryDoc, setPrimaryDoc] = useState<string>('');
  const [primaryPhone, setPrimaryPhone] = useState<string>('');
  const [primaryEmail, setPrimaryEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [guests, setGuests] = useState<Array<{ name: string; documentId: string }>>([]);

  // Result State
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [copiedYape, setCopiedYape] = useState(false);

  const nameInputId = useId();
  const docInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();
  const dateInputId = useId();

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen && params) {
      setStep('FORM');
      setErrorMessage(null);
      setSelectedCurrency(params.defaultCurrency || (params.unitPriceUSD && !params.unitPricePEN ? 'USD' : 'PEN'));
      setGuestCount(params.defaultGuestCount || 1);
      setPrimaryName('');
      setPrimaryDoc('');
      setPrimaryPhone('');
      setPrimaryEmail('');
      setNotes('');
      setGuests([]);
      setCreatedBooking(null);
      setCopiedYape(false);

      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setBookingDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen, params]);

  // Adjust guests array when guestCount changes
  useEffect(() => {
    if (guestCount > 1) {
      setGuests((prev) => {
        const currentAdditional = guestCount - 1;
        const updated = [...prev];
        while (updated.length < currentAdditional) {
          updated.push({ name: '', documentId: '' });
        }
        return updated.slice(0, currentAdditional);
      });
    } else {
      setGuests([]);
    }
  }, [guestCount]);

  if (!isOpen || !params) return null;

  const unitPrice = selectedCurrency === 'USD' && params.unitPriceUSD != null
    ? params.unitPriceUSD
    : params.unitPricePEN;

  const totalAmount = Number((unitPrice * guestCount).toFixed(2));
  const minDate = new Date().toISOString().split('T')[0];

  const handleGuestChange = (index: number, field: 'name' | 'documentId', value: string) => {
    setGuests((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!bookingDate) {
      setErrorMessage('Por favor selecciona una fecha de visita.');
      return;
    }
    if (!primaryName.trim()) {
      setErrorMessage('Por favor ingresa el nombre del titular.');
      return;
    }
    if (!primaryPhone.trim()) {
      setErrorMessage('Por favor ingresa un número de teléfono o WhatsApp válido.');
      return;
    }
    if (!primaryEmail.trim() || !primaryEmail.includes('@')) {
      setErrorMessage('Por favor ingresa un correo electrónico válido para enviar tu comprobante.');
      return;
    }

    // Check if any additional guest has an empty name
    for (let i = 0; i < guests.length; i++) {
      if (!guests[i].name.trim()) {
        setErrorMessage(`Por favor ingresa el nombre del asistente #${i + 2}.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const allGuests = [
        { name: primaryName.trim(), documentId: primaryDoc.trim() || null },
        ...guests.map((g) => ({ name: g.name.trim(), documentId: g.documentId.trim() || null }))
      ];

      const payload = {
        serviceType: params.serviceType,
        serviceId: params.serviceId || null,
        serviceTitle: params.serviceTitle,
        bookingDate,
        guestCount,
        unitPrice,
        currency: selectedCurrency,
        primaryName: primaryName.trim(),
        primaryDoc: primaryDoc.trim() || null,
        primaryPhone: primaryPhone.trim(),
        primaryEmail: primaryEmail.trim(),
        notes: notes.trim() || null,
        paymentMethod: 'YAPE',
        guests: allGuests
      };

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Error al procesar la reserva');
      }

      setCreatedBooking(data.data);
      setStep('SUCCESS');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la reserva';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyYape = () => {
    const yapeNumber = '930456857';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(yapeNumber);
      setCopiedYape(true);
      setTimeout(() => setCopiedYape(false), 2500);
    }
  };

  const handleSendWhatsAppReceipt = () => {
    if (!createdBooking) return;

    const phone = params.customWhatsAppPhone || '51930456857';
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const dateFormatted = new Date(createdBooking.bookingDate).toLocaleDateString('es-PE', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const guestLines = (createdBooking.guests || [
      { name: createdBooking.primaryName, documentId: createdBooking.primaryDoc }
    ])
      .map((g: { name: string; documentId?: string | null }, idx: number) => `   ${idx + 1}. ${g.name}${g.documentId ? ` (Doc: ${g.documentId})` : ''}${idx === 0 ? ' - *Titular*' : ''}`)
      .join('\n');

    const msg = 
`🌿 *RESERVA BEARDED MOUNTAINEER* 🌿
━━━━━━━━━━━━━━━━━━━━
📋 *Código de Reserva:* ${createdBooking.bookingCode}
🏷️ *Servicio:* ${createdBooking.serviceTitle} (${createdBooking.serviceType})
📅 *Fecha Programada:* ${dateFormatted}
👥 *Asistentes (${createdBooking.guestCount} persona${createdBooking.guestCount > 1 ? 's' : ''}):*
${guestLines}
💰 *Monto a Pagar:* ${createdBooking.currency === 'USD' ? '$' : 'S/.'} ${Number(createdBooking.totalAmount).toFixed(2)} ${createdBooking.currency}
📱 *Contacto:* ${createdBooking.primaryPhone}
✉️ *Correo:* ${createdBooking.primaryEmail}
━━━━━━━━━━━━━━━━━━━━
✅ *Adjunto mi comprobante de pago de Yape para confirmar mi reserva.*`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto"
        onClick={closeBooking}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-bg-card border border-border-custom text-primary rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border-custom/60 bg-background/50">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> {params.categoryBadge || 'Reserva Oficial & Pago Yape'}
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
                {params.serviceTitle}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeBooking}
              className="p-2 rounded-full text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
            {step === 'FORM' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Selección de Fecha y Cantidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={dateInputId} className="block text-xs font-bold uppercase tracking-wider text-primary/70 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-accent" /> Fecha de Visita / Reserva *
                    </label>
                    <input
                      id={dateInputId}
                      type="date"
                      min={minDate}
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-background text-sm font-medium focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary/70 mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-accent" /> Cantidad de Personas *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuestCount((prev) => Math.max(1, prev - 1))}
                        disabled={guestCount <= 1}
                        className="w-10 h-10 rounded-xl bg-background border border-border-custom flex items-center justify-center font-bold text-lg hover:border-accent disabled:opacity-40 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={params.maxGuests || 20}
                        value={guestCount}
                        onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center py-2.5 rounded-xl border border-border-custom bg-background font-bold text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setGuestCount((prev) => Math.min(params.maxGuests || 20, prev + 1))}
                        className="w-10 h-10 rounded-xl bg-background border border-border-custom flex items-center justify-center font-bold text-lg hover:border-accent transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Moneda & Resumen de Inversión */}
                <div className="p-4 rounded-2xl bg-background border border-border-custom flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-primary/50 block">Inversión Calculada:</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="font-serif text-2xl font-bold text-primary">
                        {selectedCurrency === 'USD' ? '$' : 'S/.'} {totalAmount.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-primary/60">{selectedCurrency}</span>
                      <span className="text-[11px] text-primary/50">({guestCount} persona{guestCount > 1 ? 's' : ''} × {selectedCurrency === 'USD' ? '$' : 'S/.'} {unitPrice.toFixed(2)})</span>
                    </div>
                  </div>

                  {params.unitPriceUSD != null && params.unitPricePEN != null && (
                    <div className="flex items-center gap-1.5 bg-bg-card p-1 rounded-xl border border-border-custom">
                      <button
                        type="button"
                        onClick={() => setSelectedCurrency('PEN')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${selectedCurrency === 'PEN' ? 'bg-primary-solid text-white shadow-sm' : 'text-primary/70 hover:text-primary'}`}
                      >
                        Soles (PEN)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCurrency('USD')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${selectedCurrency === 'USD' ? 'bg-primary-solid text-white shadow-sm' : 'text-primary/70 hover:text-primary'}`}
                      >
                        Dólares (USD)
                      </button>
                    </div>
                  )}
                </div>

                {/* Datos del Titular (Persona 1 que realiza el pago) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-border-custom/50 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                      <User className="w-4 h-4 text-accent" /> Datos del Titular (Responsable del Pago)
                    </span>
                    <span className="text-[10px] text-primary/50">Persona 1</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor={nameInputId} className="block text-xs font-medium text-primary/80 mb-1">Nombre Completo *</label>
                      <input
                        id={nameInputId}
                        type="text"
                        required
                        placeholder="ej: Juan Carlos Pérez"
                        value={primaryName}
                        onChange={(e) => setPrimaryName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-background text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor={docInputId} className="block text-xs font-medium text-primary/80 mb-1">DNI / Pasaporte (Opcional)</label>
                      <input
                        id={docInputId}
                        type="text"
                        placeholder="ej: 72819283"
                        value={primaryDoc}
                        onChange={(e) => setPrimaryDoc(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-background text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor={phoneInputId} className="block text-xs font-medium text-primary/80 mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-secondary" /> WhatsApp / Teléfono *
                      </label>
                      <input
                        id={phoneInputId}
                        type="tel"
                        required
                        placeholder="ej: 987654321"
                        value={primaryPhone}
                        onChange={(e) => setPrimaryPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-background text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor={emailInputId} className="block text-xs font-medium text-primary/80 mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-secondary" /> Correo Electrónico *
                      </label>
                      <input
                        id={emailInputId}
                        type="email"
                        required
                        placeholder="ej: juan@correo.com"
                        value={primaryEmail}
                        onChange={(e) => setPrimaryEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-background text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                      />
                      <span className="text-[10px] text-primary/50 mt-0.5 block">Para enviarte el voucher y confirmación.</span>
                    </div>
                  </div>
                </div>

                {/* Acompañantes adicionales */}
                {guests.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="border-b border-border-custom/50 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-accent" /> Datos de los Acompañantes ({guests.length})
                      </span>
                    </div>

                    <div className="space-y-3">
                      {guests.map((guest, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-background border border-border-custom space-y-2">
                          <span className="text-[11px] font-bold text-primary/70 block">Asistente #{idx + 2}</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              required
                              placeholder="Nombre completo *"
                              value={guest.name}
                              onChange={(e) => handleGuestChange(idx, 'name', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-border-custom bg-bg-card text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="DNI / Pasaporte (Opcional)"
                              value={guest.documentId}
                              onChange={(e) => handleGuestChange(idx, 'documentId', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-border-custom bg-bg-card text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas adicionales */}
                <div>
                  <label className="block text-xs font-medium text-primary/70 mb-1">Notas o Peticiones Especiales (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="ej: Dietas especiales, requerimiento de telescopio o prismáticos..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border-custom bg-background text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                  />
                </div>

                {/* Botón de Enviar */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#6F1D7E] hover:bg-[#581564] text-white py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generando Reserva...</span>
                      </div>
                    ) : (
                      <>
                        <span>Continuar al Pago Yape & Confirmación</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-primary/50 mt-2">
                    🔒 Registro protegido. Podrás transferir por Yape y enviar tu comprobante directamente a nuestro WhatsApp oficial.
                  </p>
                </div>
              </form>
            ) : (
              /* Paso 2: Yape y Envío de Comprobante por WhatsApp */
              <div className="space-y-6">
                {/* Banner de Éxito */}
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                    <Check className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                    ¡Reserva Registrada Exitosamente!
                  </span>
                  <div className="text-xl sm:text-2xl font-serif font-extrabold text-emerald-900 tracking-wide">
                    Código: {createdBooking?.bookingCode}
                  </div>
                  <p className="text-xs text-emerald-700 font-light">
                    Realiza tu pago vía Yape y envía el comprobante por WhatsApp para validar tu reserva.
                  </p>
                </div>

                {/* Módulo de Pago Yape */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#742284] to-[#4D1458] text-white space-y-4 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-base text-white">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#00D4B8] block">Pago Oficial</span>
                        <h3 className="font-bold text-lg leading-tight">Yape de Antigravity</h3>
                      </div>
                    </div>
                    <span className="bg-[#00D4B8] text-[#1E2C22] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Titular Oficial
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider block">Número Yape Vinculado:</span>
                      <strong className="text-xl sm:text-2xl font-mono tracking-wider font-bold block text-white">
                        930 456 857
                      </strong>
                      <span className="text-xs text-white/90 font-medium">Titular: Uriel Caballero Quispitupa</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyYape}
                      className="bg-white text-[#742284] hover:bg-[#00D4B8] hover:text-[#1E2C22] font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-md"
                    >
                      {copiedYape ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Número</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-white/15">
                    <span className="text-xs text-white/80 font-medium">Monto Exacto a Yapear:</span>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-serif font-extrabold text-[#00D4B8]">
                        S/. {Number(createdBooking?.totalAmount).toFixed(2)}
                      </span>
                      <span className="text-xs text-white/70 ml-1">PEN</span>
                    </div>
                  </div>
                </div>

                {/* Envío de Comprobante por WhatsApp */}
                <div className="p-5 rounded-2xl bg-background border border-border-custom space-y-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-primary">Paso Final: Enviar Comprobante</h4>
                      <p className="text-xs text-primary/70 leading-relaxed font-light mt-0.5">
                        Al hacer clic abajo, se abrirá WhatsApp con el resumen de tu reserva prellenado para que sólo tengas que adjuntar la captura del comprobante de Yape.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendWhatsAppReceipt}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Comprobante por WhatsApp</span>
                    <ExternalLink className="w-4 h-4 opacity-80" />
                  </button>
                </div>

                {/* Botón de Salir / Finalizar */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={closeBooking}
                    className="text-xs text-primary/60 hover:text-primary underline font-medium"
                  >
                    Cerrar ventana y volver al sitio
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
