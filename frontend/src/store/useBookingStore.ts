import { create } from 'zustand';

export interface BookingModalParams {
  serviceType: 'LODGE' | 'EXPERIENCIA' | 'PASE' | 'TOUR' | 'TALLER' | 'GENERAL';
  serviceId?: string;
  serviceTitle: string;
  unitPricePEN: number;
  unitPriceUSD?: number | null;
  defaultCurrency?: 'PEN' | 'USD';
  defaultGuestCount?: number;
  maxGuests?: number;
  categoryBadge?: string;
  customWhatsAppPhone?: string;
}

interface BookingStoreState {
  isOpen: boolean;
  params: BookingModalParams | null;
  openBooking: (params: BookingModalParams) => void;
  closeBooking: () => void;
}

export const useBookingStore = create<BookingStoreState>((set) => ({
  isOpen: false,
  params: null,
  openBooking: (params) => set({ isOpen: true, params }),
  closeBooking: () => set({ isOpen: false, params: null }),
}));
