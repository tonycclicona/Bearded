export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('beardedmountaineerlodge.com') 
    ? 'https://api.beardedmountaineerlodge.com/api' 
    : 'http://localhost:4000/api');


export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const rawVal = parts.pop()?.split(';').shift();
    if (rawVal) {
      try { return decodeURIComponent(rawVal); } catch (_) { return rawVal; }
    }
  }
  try {
    return localStorage.getItem(name);
  } catch (_) {
    return null;
  }
}

export function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 86400;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();

  // 1. Cookie estándar en la ruta raíz
  document.cookie = `${name}=${value}; expires=${expires}; max-age=${maxAge}; path=/; SameSite=Lax`;

  // 2. Cookie de dominio raíz para compartir entre subdominios si aplica
  try {
    const hostname = window.location.hostname;
    if (hostname.includes('beardedmountaineerlodge.com')) {
      document.cookie = `${name}=${value}; expires=${expires}; max-age=${maxAge}; path=/; domain=.beardedmountaineerlodge.com; SameSite=Lax`;
    }
  } catch (_) {}

  // 3. Respaldo infalible en localStorage
  try {
    localStorage.setItem(name, value);
  } catch (_) {}
}

export function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0;`;
  try {
    const hostname = window.location.hostname;
    if (hostname.includes('beardedmountaineerlodge.com')) {
      document.cookie = `${name}=; path=/; domain=.beardedmountaineerlodge.com; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0;`;
    }
  } catch (_) {}
  try {
    localStorage.removeItem(name);
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
    const error = new Error(errorData.error || errorData.message || `Error ${res.status}: ${res.statusText}`);
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
    if (res.status === 401 || res.status === 403) {
      removeCookie('session_token');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        const isSubdomain = window.location.hostname.startsWith('admin.');
        window.location.href = isSubdomain ? '/login' : '/admin/login';
      }
    }
    throw new Error(data.error || data.message || `Error ${res.status}`);
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
    throw new Error(data.error || data.message || `Error al subir archivo`);
  }
  return data;
}
