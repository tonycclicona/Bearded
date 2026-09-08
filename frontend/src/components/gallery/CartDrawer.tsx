'use client';

import React, { useState } from 'react';
import { useCartStore } from '@/store/cart-store';
import { processCheckout } from '@/services/cart.service';
import { CartItem, PhotoWorkshopPackage } from '@/types';
import { X, Trash2, ShoppingBag, CreditCard, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const isWorkshopItem = (item: CartItem): item is Extract<CartItem, { product: PhotoWorkshopPackage }> =>
  'category' in item.product;

const cartItemImage = (item: CartItem): string | null =>
  'category' in item.product ? null : item.product.imageUrl;

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, clearCart, totalPrice } = useCartStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ id: number; paymentUrl: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await processCheckout({
        billing: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone
        },
        items: items
      });

      setOrderSuccess({
        id: result.id,
        paymentUrl: result.payment_url
      });
      clearCart();
    } catch (err) {
      alert('Hubo un error al procesar el pedido. Inténtalo de nuevo.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50"
          />

          {/* Panel Lateral */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.4 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-bg-card z-50 shadow-2xl flex flex-col justify-between"
          >
            {/* Header */}
            <div className="p-6 border-b border-border-custom flex justify-between items-center bg-background">
              <div className="flex items-center gap-2 text-primary">
                <ShoppingBag className="w-5 h-5" />
                <h3 className="font-serif text-lg font-bold">Carrito de Compras</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1 rounded-full hover:bg-primary/5 text-primary/75 transition-colors"
                aria-label="Cerrar carrito"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {orderSuccess ? (
                /* ÉXITO DE COMPRA */
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-12 px-4 space-y-6"
                >
                  <CheckCircle2 className="w-16 h-16 text-secondary mx-auto animate-bounce" />
                  <div>
                    <h4 className="font-serif text-2xl font-bold text-primary">¡Pedido Recibido!</h4>
                    <p className="text-sm text-primary/65 mt-2">
                      Tu pedido #{orderSuccess.id} ha sido registrado de forma segura en nuestro sistema de reservas.
                    </p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-xs text-left leading-relaxed">
                    <strong>Siguiente Paso:</strong> Te enviaremos un correo con las instrucciones de pago e links de descarga para las fotos y comprobantes del taller. Puedes hacer click abajo para ver tu simulación.
                  </div>
                  <a
                    href={orderSuccess.paymentUrl}
                    className="inline-flex items-center gap-2 bg-primary-solid text-white text-xs uppercase font-bold tracking-wider px-6 py-3 rounded-full hover:bg-accent hover:text-primary transition-all"
                  >
                    Ver Confirmación <ChevronRight className="w-4 h-4" />
                  </a>
                </motion.div>
              ) : items.length === 0 ? (
                /* CARRITO VACÍO */
                <div className="text-center py-20 text-primary/50">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-light text-sm">Tu carrito está vacío.</p>
                  <p className="text-xs font-light mt-1">Agrega fotos digitales o talleres para comenzar.</p>
                </div>
              ) : (
                /* LISTADO DE ITEMS */
                <div className="space-y-4">
                  {items.map((item) => {
                    const isWorkshop = isWorkshopItem(item);
                    return (
                      <div 
                        key={item.product.id} 
                        className="flex gap-4 p-3 border border-border-custom rounded-2xl bg-background"
                      >
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-primary/10">
                          {/* Muestra imagen de la foto o logo/color si es taller */}
                          {isWorkshopItem(item) ? (
                            <div className="w-full h-full bg-primary-solid flex items-center justify-center text-white text-xs font-serif font-bold">
                              WS
                            </div>
                          ) : (
                            <img 
                              src={cartItemImage(item) ?? ''} 
                              alt={item.product.title} 
                              className="object-cover w-full h-full"
                            />
                          )}
                        </div>
                        <div className="flex-grow flex flex-col justify-between min-w-0">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-accent">
                              {isWorkshop ? 'Taller de Fotografía' : 'Foto Digital'}
                            </span>
                            <h4 className="font-medium text-sm text-primary truncate leading-snug">
                              {item.product.title}
                            </h4>
                          </div>
                          <span className="text-xs font-bold font-serif text-primary">
                            S/. {item.product.price} PEN
                          </span>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-red-500 hover:text-red-700 self-center p-2 rounded-full hover:bg-red-50 transition-colors"
                          aria-label="Eliminar item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {/* FORMULARIO DE CHECKOUT */}
                  <form onSubmit={handleSubmit} className="border-t border-border-custom pt-6 space-y-4">
                    <h5 className="font-serif font-bold text-sm text-primary flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" /> Detalles de Reserva & Facturación
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-primary/60 block mb-1">Nombre</label>
                        <input
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full bg-bg-card border border-border-custom rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent"
                          placeholder="Juan"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-primary/60 block mb-1">Apellido</label>
                        <input
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full bg-bg-card border border-border-custom rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent"
                          placeholder="Pérez"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-primary/60 block mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-bg-card border border-border-custom rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent"
                        placeholder="juan.perez@email.com"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-primary/60 block mb-1">Celular / WhatsApp</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-bg-card border border-border-custom rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent"
                        placeholder="+51 987 654 321"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full mt-4 bg-primary-solid text-white hover:bg-accent hover:text-primary py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:bg-primary/45"
                    >
                      {isSubmitting ? 'Procesando...' : `Confirmar Pedido (S/. ${totalPrice()} PEN)`}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Footer */}
            {!orderSuccess && items.length > 0 && (
              <div className="p-6 border-t border-border-custom bg-background">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-primary/60">Subtotal</span>
                  <span className="text-lg font-serif font-bold text-primary">S/. {totalPrice()} PEN</span>
                </div>
                <p className="text-[10px] text-primary/50 text-center leading-relaxed">
                  Las descargas de fotos digitales se habilitarán tras confirmar la transferencia bancaria.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
