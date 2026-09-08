export type Difficulty = 'FACIL' | 'MODERADO' | 'DIFICIL';
export type PhotographCategory = 'NATURALEZA' | 'AVES' | 'PAISAJES' | 'OTROS';
export type PhotoType = 'AVES' | 'PAISAJE';
export type CategoriaPuntoGIS = 'HOTSPOT_COMEDERO' | 'OBSERVATORIO_SILVESTRE' | 'ESPECIE_ENDEMICA' | 'CAMPAMENTO_REFUGIO' | 'LOGISTICA_PUNTO_ENCUENTRO';
export type PisoEcologico = 'TODOS' | 'YUNGA' | 'QUECHUA' | 'SUNI_PUNA';
export interface EspecieColibri {
    id: number;
    nombreComun: string;
    nombreCientifico: string;
    familia: string;
    estadoIUCN: string;
    endemicoPeru: boolean;
    altitudMinMsnm: number;
    altitudMaxMsnm: number;
    descripcion: string;
    fotoPrincipal: string;
    galeriaFotos?: string | null;
    audioCantoUrl?: string | null;
    hotspots?: PuntoGIS[];
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface PuntoGIS {
    id: number;
    nombre: string;
    slug: string;
    categoria: CategoriaPuntoGIS | string;
    departamento: string;
    latitud: number;
    longitud: number;
    altitudMsnm: number;
    mejorTemporada: string;
    acceso: string;
    descripcion: string;
    fotoUrl?: string | null;
    activo: boolean;
    especies?: EspecieColibri[];
    toursAsociados?: Tour[];
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface TourImagen {
    id: number;
    tourId: number;
    url: string;
    esPortada: boolean;
}
export interface Tour {
    id: number;
    nombre: string;
    slug: string;
    descripcion: string;
    itinerario?: string | null;
    regionRuta: string;
    nivelCaminata: string;
    equipoOpticoReq?: string | null;
    precio_adulto: number;
    precio_adulto_usd?: number | null;
    precio_nino?: number | null;
    precio_nino_usd?: number | null;
    showPEN?: boolean;
    showUSD?: boolean;
    duracion_dias: number;
    cupos_disponibles: number;
    servicios_incluidos: string;
    servicios_excluidos: string;
    que_llevar: string;
    activo: boolean;
    destacado: boolean;
    hotspots?: PuntoGIS[];
    imagenes?: TourImagen[];
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface Guia {
    id: number;
    nombre: string;
    especialidad: string;
    experiencia: string;
    idiomas: string;
    foto: string;
    descripcion: string;
    activo: boolean;
    orden: number;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface HummingbirdPass {
    id: string;
    title: string;
    price: number;
    priceUSD?: number | null;
    showPEN?: boolean;
    showUSD?: boolean;
    description: string;
    features: string[];
    featured: boolean;
    sortOrder: number;
}
export interface HummingbirdSpot {
    id: string;
    title: string;
    description: string;
    benefits: string[];
    imageUrl: string;
    sortOrder: number;
}
export interface Route {
    id: string;
    title: string;
    difficulty: Difficulty;
    duration: string;
    price: number;
    priceUSD?: number | null;
    showPEN?: boolean;
    showUSD?: boolean;
    description: string;
    startPoint: string;
    sortOrder: number;
}
export interface Room {
    id: string;
    name: string;
    pricePerNight: number;
    pricePerNightUSD?: number | null;
    showPEN?: boolean;
    showUSD?: boolean;
    capacity: number;
    amenities: string[];
    imageUrl: string;
    gallery?: string[];
    featured: boolean;
    sortOrder: number;
}
export interface LodgeExperience {
    id: string;
    title: string;
    price: number;
    priceUSD?: number | null;
    showPEN?: boolean;
    showUSD?: boolean;
    duration: string;
    description: string;
    included: string[];
    imageUrl?: string;
    sortOrder: number;
}
export interface PhotoProduct {
    id: string;
    title: string;
    slug: string;
    price: number;
    priceUSD?: number | null;
    showPEN?: boolean;
    showUSD?: boolean;
    description: string;
    imageUrl: string;
    type: PhotoType;
    featured: boolean;
    sortOrder: number;
    metadata: {
        species?: string;
        location?: string;
        camera?: string;
        resolution?: string;
    };
}
export interface PhotoWorkshopPackage {
    id: string;
    title: string;
    category: PhotographCategory;
    price: number;
    priceUSD?: number | null;
    showPEN?: boolean;
    showUSD?: boolean;
    duration: string;
    description: string;
    included: string[];
    featured: boolean;
    sortOrder: number;
}
export interface CartItem {
    product: PhotoProduct | PhotoWorkshopPackage;
    quantity: number;
}
export interface BookingGuest {
    id?: string;
    name: string;
    documentId?: string | null;
    isPrimary?: boolean;
}
export interface Booking {
    id: string;
    bookingCode: string;
    serviceType: 'LODGE' | 'EXPERIENCIA' | 'PASE' | 'TOUR' | 'TALLER' | 'GENERAL';
    serviceId?: string | null;
    serviceTitle: string;
    bookingDate: string | Date;
    guestCount: number;
    unitPrice: number;
    totalAmount: number;
    currency: 'PEN' | 'USD';
    status: 'PENDIENTE_PAGO' | 'COMPROBANTE_ENVIADO' | 'CONFIRMADA' | 'CANCELADA';
    paymentMethod: string;
    primaryName: string;
    primaryEmail: string;
    primaryPhone: string;
    primaryDoc?: string | null;
    notes?: string | null;
    guests?: BookingGuest[];
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface CreateBookingInput {
    serviceType: 'LODGE' | 'EXPERIENCIA' | 'PASE' | 'TOUR' | 'TALLER' | 'GENERAL';
    serviceId?: string | null;
    serviceTitle: string;
    bookingDate: string;
    guestCount: number;
    unitPrice: number;
    currency?: 'PEN' | 'USD';
    primaryName: string;
    primaryEmail: string;
    primaryPhone: string;
    primaryDoc?: string | null;
    notes?: string | null;
    guests?: Array<{
        name: string;
        documentId?: string | null;
    }>;
}
export interface ApiResponse<T> {
    data: T;
    error: null | {
        code: string;
        message: string;
        statusCode: number;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
}
//# sourceMappingURL=index.d.ts.map