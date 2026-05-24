import type { APIResponse } from './types';

export const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ??
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/i, '') ??
  '';

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const TOKEN_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
} as const;

const PUBLIC_AUTH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
]);

function isPublicPath(path: string): boolean {
  return PUBLIC_AUTH_PATHS.has(path) || path.startsWith('/users/public/');
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function parseResponse<T>(res: Response): Promise<APIResponse<T>> {
  try {
    return (await res.json()) as APIResponse<T>;
  } catch {
    throw new ApiError(res.statusText || 'Invalid server response', res.status);
  }
}

async function refreshTokens(): Promise<boolean> {
  const refresh = localStorage.getItem(TOKEN_KEYS.refresh);
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const json = await parseResponse<{
      access_token: string;
      refresh_token: string;
    }>(res);

    if (json.success && json.data) {
      tokenStorage.set(json.data);
      return true;
    }
  } catch {
    // fall through
  }

  return false;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const isPublicAuth = isPublicPath(path);
  const token = localStorage.getItem(TOKEN_KEYS.access);
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!headers.has('Content-Type') && options.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !isPublicAuth) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await parseResponse<T>(res);

  if (res.status === 401 && retry && !isPublicAuth) {
    const refreshed = await refreshTokens();
    if (refreshed) return apiRequest<T>(path, options, false);
    tokenStorage.clear();
  }

  if (!json.success) {
    throw new ApiError(json.message || 'Request failed', res.status, json.details);
  }

  return json.data as T;
}

export const tokenStorage = {
  set(tokens: { access_token: string; refresh_token: string }) {
    localStorage.setItem(TOKEN_KEYS.access, tokens.access_token);
    localStorage.setItem(TOKEN_KEYS.refresh, tokens.refresh_token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
  },
  hasToken() {
    return !!localStorage.getItem(TOKEN_KEYS.access);
  },
};

export async function checkHealth(): Promise<boolean> {
  try {
    const healthUrl = API_ORIGIN
      ? `${API_ORIGIN.replace(/\/$/, '')}/health`
      : '/health';
    const res = await fetch(healthUrl);
    const json = await res.json();
    return json?.data?.status === 'ok' || json?.status === 'ok';
  } catch {
    return false;
  }
}
