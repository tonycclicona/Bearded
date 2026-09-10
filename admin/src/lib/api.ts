export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('beardedmountaineerlodge.com') 
    ? 'https://api.beardedmountaineerlodge.com/api' 
    : 'http://localhost:4000/api');

export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${cleanPath}`;
}

export function extractErrorMessage(data: any, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.error === 'string') return data.error;
  if (data.error && typeof data.error.message === 'string') return data.error.message;
  if (data.error && typeof data.error.code === 'string') {
    return `${data.error.code}: ${data.error.message || ''}`;
  }
  if (typeof data.message === 'string') return data.message;
  if (typeof data.details === 'string') return data.details;
  if (typeof data.error === 'object' && data.error !== null) {
    try {
      return JSON.stringify(data.error);
    } catch (_) {}
  }
  return fallback;
}

export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromStorage = localStorage.getItem(name);
    if (fromStorage) return fromStorage;
  } catch (_) {}

  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const rawVal = parts.pop()?.split(';').shift();
      if (rawVal) {
        try { return decodeURIComponent(rawVal); } catch (_) { return rawVal; }
      }
    }
  } catch (_) {}
  return null;
}

export function setCookie(name: string, value: string, days: number = 7) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(name, value);
    sessionStorage.setItem(name, value);
  } catch (_) {}

  try {
    const maxAge = days * 86400;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; max-age=${maxAge}; path=/; SameSite=Lax`;
  } catch (_) {}
}

export function removeCookie(name: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  } catch (_) {}
  try {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; SameSite=Lax`;
  } catch (_) {}
}

export async function fetcher<T = any>(endpoint: string): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getCookie('session_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const res = await fetch(`${API_BASE_URL}${cleanEndpoint}`, { headers });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = extractErrorMessage(errorData, `Error ${res.status}: ${res.statusText}`);
    const error = new Error(message);
    (error as any).status = res.status;
    throw error;
  }
  
  const json = await res.json();
  return json?.data !== undefined ? json.data : json;
}

export async function mutateApi<T = any>(
  endpoint: string,
  options: { method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: any } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const token = getCookie('session_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const res = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    method: options.method || 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = extractErrorMessage(data, `Error ${res.status}`);
    throw new Error(message);
  }

  return data;
}

export async function uploadApi<T = any>(endpoint: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getCookie('session_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const res = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    method: 'POST',
    headers,
    body: formData
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = extractErrorMessage(data, 'Error al subir archivo');
    throw new Error(message);
  }
  return data;
}
