import {
  HummingbirdPass,
  HummingbirdSpot,
  Route,
  Room,
  LodgeExperience,
  PhotoProduct,
  PhotoWorkshopPackage,
  EspecieColibri,
  PuntoGIS,
  Tour,
  Guia
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002';

export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/admin/uploads/') || url.startsWith('/uploads/')) {
    const cleanPath = url.startsWith('/admin/uploads/') ? url : `/admin${url}`;
    if (ADMIN_URL && !ADMIN_URL.includes('localhost') && typeof window !== 'undefined') {
      return `${ADMIN_URL}${cleanPath}`;
    }
    return cleanPath;
  }
  return url;
}

export const resolveAudioUrl = resolveImageUrl;

async function fetchApi<T>(endpoint: string, fallbackValue: T): Promise<T> {
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;
    const res = await fetch(`${API_URL}/${endpoint}`, {
      signal: controller?.signal
    });
    if (timeoutId) clearTimeout(timeoutId);
    if (!res.ok) {
      console.warn(`[ContentService] API error on ${endpoint}: ${res.statusText}`);
      return fallbackValue;
    }
    const json = await res.json();
    return (json?.data !== undefined ? json.data : json) as T;
  } catch (err: unknown) {
    console.warn(`[ContentService] Fallback for ${endpoint}:`, err instanceof Error ? err.message : err);
    return fallbackValue;
  }
}

export class ContentService {
  // Especies de Colibríes (Catálogo Taxonómico)
  static async getEspeciesColibries(params?: { endemico?: boolean; iucn?: string }): Promise<EspecieColibri[]> {
    const query = new URLSearchParams();
    if (params?.endemico !== undefined) query.append('endemico', String(params.endemico));
    if (params?.iucn) query.append('iucn', params.iucn);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<EspecieColibri[]>(`colibries${qs}`, []);
  }

  static async getEspecieColibriById(id: number): Promise<EspecieColibri | null> {
    return fetchApi<EspecieColibri | null>(`colibries/${id}`, null);
  }

  // Puntos GIS & Hotspots
  static async getPuntosGIS(params?: { categoria?: string; departamento?: string; piso?: string }): Promise<PuntoGIS[]> {
    const query = new URLSearchParams();
    if (params?.categoria && params.categoria !== 'TODOS') query.append('categoria', params.categoria);
    if (params?.departamento) query.append('departamento', params.departamento);
    if (params?.piso && params.piso !== 'TODOS') query.append('piso', params.piso);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<PuntoGIS[]>(`puntos-gis${qs}`, []);
  }

  static async getPuntoGISBySlug(slug: string): Promise<PuntoGIS | null> {
    return fetchApi<PuntoGIS | null>(`puntos-gis/${slug}`, null);
  }

  // Tours & Expediciones
  static async getTours(params?: { region?: string; destacado?: boolean }): Promise<Tour[]> {
    const query = new URLSearchParams();
    if (params?.region && params.region !== 'TODAS') query.append('region', params.region);
    if (params?.destacado !== undefined) query.append('destacado', String(params.destacado));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<Tour[]>(`tours${qs}`, []);
  }

  static async getTourBySlug(slug: string): Promise<Tour | null> {
    return fetchApi<Tour | null>(`tours/${slug}`, null);
  }

  // Guías Ornitólogos
  static async getGuias(): Promise<Guia[]> {
    return fetchApi<Guia[]>('guias', []);
  }

  // Servicios existentes
  static async getHummingbirdPasses(): Promise<HummingbirdPass[]> {
    return fetchApi<HummingbirdPass[]>('passes', []);
  }

  static async getHummingbirdSpots(): Promise<HummingbirdSpot[]> {
    return fetchApi<HummingbirdSpot[]>('hummingbird-spots', []);
  }

  static async getRoutes(): Promise<Route[]> {
    return fetchApi<Route[]>('routes', []);
  }

  static async getRooms(): Promise<Room[]> {
    return fetchApi<Room[]>('rooms', []);
  }

  static async getExperiences(): Promise<LodgeExperience[]> {
    return fetchApi<LodgeExperience[]>('experiences', []);
  }

  static async getPhotos(): Promise<PhotoProduct[]> {
    return fetchApi<PhotoProduct[]>('photos', []);
  }

  static async getPhotoBySlug(slug: string): Promise<PhotoProduct | null> {
    return fetchApi<PhotoProduct | null>(`photos/${slug}`, null);
  }

  static async getWorkshops(): Promise<PhotoWorkshopPackage[]> {
    return fetchApi<PhotoWorkshopPackage[]>('workshops', []);
  }

  static async getWorkshopById(id: string): Promise<PhotoWorkshopPackage | null> {
    return fetchApi<PhotoWorkshopPackage | null>(`workshops/${id}`, null);
  }
}