import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getGuestToken } from './guestToken';

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setOnUnauthorizedCallback(cb: () => void): void {
  onUnauthorizedCallback = cb;
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function tokenExpiresSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 - Date.now() < 30_000;
  } catch {
    return false;
  }
}

// Renovar antes de que venza: vencido, hasta las rutas públicas dan 401
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (
    inMemoryAccessToken &&
    tokenExpiresSoon(inMemoryAccessToken) &&
    !config.url?.includes('/auth/')
  ) {
    refreshPromise ??= axios
      .post<{ ok: boolean; accessToken: string }>('/api/v1/auth/refresh', {}, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
    await refreshPromise;
  }
  return config;
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (inMemoryAccessToken) {
    config.headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }
  const guestToken = getGuestToken();
  if (guestToken) {
    config.headers.set('X-Guest-Token', guestToken);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Sin reintento para refresh ni login
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Un solo refresh compartido para los 401 simultáneos
    if (!refreshPromise) {
      refreshPromise = axios
        .post<{ ok: boolean; accessToken: string }>('/api/v1/auth/refresh', {}, { withCredentials: true })
        .then((res) => {
          const newToken = res.data.accessToken;
          setAccessToken(newToken);
          return newToken;
        })
        .catch((err) => {
          setAccessToken(null);
          if (onUnauthorizedCallback) {
            onUnauthorizedCallback();
          }
          return null;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const token = await refreshPromise;
    if (token) {
      originalRequest.headers.set('Authorization', `Bearer ${token}`);
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);
