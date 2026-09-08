import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, PhotoProduct, PhotoWorkshopPackage } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (product: PhotoProduct | PhotoWorkshopPackage) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const items = get().items;
        const exists = items.find(item => item.product.id === product.id);
        if (exists) return; // Se compra una sola vez por ser digital o inscripción única
        set({ items: [...items, { product, quantity: 1 }] });
      },
      removeItem: (productId) => {
        set({ items: get().items.filter(item => item.product.id !== productId) });
      },
      clearCart: () => set({ items: [] }),
      totalPrice: () => get().items.reduce((total, item) => total + item.product.price, 0),
    }),
    {
      name: 'bearded-mountaineer-cart',
    }
  )
);
