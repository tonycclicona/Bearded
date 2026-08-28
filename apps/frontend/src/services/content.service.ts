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
  if (url.startsWith('/admin/uploads/')) {
    return `${ADMIN_URL}${url}`;
  }
  return url;
}

export const resolveAudioUrl = resolveImageUrl;

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}/${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data;
}

export class ContentService {
  // Especies de Colibríes (Catálogo Taxonómico)
  static async getEspeciesColibries(params?: { endemico?: boolean; iucn?: string }): Promise<EspecieColibri[]> {
    const query = new URLSearchParams();
    if (params?.endemico !== undefined) query.append('endemico', String(params.endemico));
    if (params?.iucn) query.append('iucn', params.iucn);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<EspecieColibri[]>(`colibries${qs}`);
  }

  static async getEspecieColibriById(id: number): Promise<EspecieColibri | null> {
    try {
      return await fetchApi<EspecieColibri>(`colibries/${id}`);
    } catch {
      return null;
    }
  }

  // Puntos GIS & Hotspots
  static async getPuntosGIS(params?: { categoria?: string; departamento?: string; piso?: string }): Promise<PuntoGIS[]> {
    const query = new URLSearchParams();
    if (params?.categoria && params.categoria !== 'TODOS') query.append('categoria', params.categoria);
    if (params?.departamento) query.append('departamento', params.departamento);
    if (params?.piso && params.piso !== 'TODOS') query.append('piso', params.piso);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<PuntoGIS[]>(`puntos-gis${qs}`);
  }

  static async getPuntoGISBySlug(slug: string): Promise<PuntoGIS | null> {
    try {
      return await fetchApi<PuntoGIS>(`puntos-gis/${slug}`);
    } catch {
      return null;
    }
  }

  // Tours & Expediciones
  static async getTours(params?: { region?: string; destacado?: boolean }): Promise<Tour[]> {
    const query = new URLSearchParams();
    if (params?.region && params.region !== 'TODAS') query.append('region', params.region);
    if (params?.destacado !== undefined) query.append('destacado', String(params.destacado));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<Tour[]>(`tours${qs}`);
  }

  static async getTourBySlug(slug: string): Promise<Tour | null> {
    try {
      return await fetchApi<Tour>(`tours/${slug}`);
    } catch {
      return null;
    }
  }

  // Guías Ornitólogos
  static async getGuias(): Promise<Guia[]> {
    return fetchApi<Guia[]>('guias');
  }

  // Servicios existentes
  static async getHummingbirdPasses(): Promise<HummingbirdPass[]> {
    return fetchApi<HummingbirdPass[]>('passes');
  }

  static async getHummingbirdSpots(): Promise<HummingbirdSpot[]> {
    return fetchApi<HummingbirdSpot[]>('hummingbird-spots');
  }

  static async getRoutes(): Promise<Route[]> {
    return fetchApi<Route[]>('routes');
  }

  static async getRooms(): Promise<Room[]> {
    return fetchApi<Room[]>('rooms');
  }

  static async getExperiences(): Promise<LodgeExperience[]> {
    return fetchApi<LodgeExperience[]>('experiences');
  }

  static async getPhotos(): Promise<PhotoProduct[]> {
    return fetchApi<PhotoProduct[]>('photos');
  }

  static async getPhotoBySlug(slug: string): Promise<PhotoProduct | null> {
    try {
      return await fetchApi<PhotoProduct>(`photos/${slug}`);
    } catch {
      return null;
    }
  }

  static async getWorkshops(): Promise<PhotoWorkshopPackage[]> {
    return fetchApi<PhotoWorkshopPackage[]>('workshops');
  }

  static async getWorkshopById(id: string): Promise<PhotoWorkshopPackage | null> {
    try {
      return await fetchApi<PhotoWorkshopPackage>(`workshops/${id}`);
    } catch {
      return null;
    }
  }
}