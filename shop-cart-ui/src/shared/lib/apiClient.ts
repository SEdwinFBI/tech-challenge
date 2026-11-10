import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getGuestToken } from './guestToken';
import { isAuthUncertain } from './apiErrors';
import type { User } from '@/shared/types/domain';

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<RefreshResult> | null = null;
let onUnauthorizedCallback: (() => void) | null = null;
let onUncertainCallback: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setOnUnauthorizedCallback(cb: () => void): void {
  onUnauthorizedCallback = cb;
}

export function setOnAuthUncertainCallback(cb: () => void): void {
  onUncertainCallback = cb;
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

export interface RefreshResult {
  ok: boolean;
  accessToken: string;
  usuario: User;
}

// Un solo refresh en vuelo: con rotación, reusar el mismo refresh token cierra la sesión
export function refreshSession(): Promise<RefreshResult> {
  refreshPromise ??= apiClient
    .post<RefreshResult>('/auth/refresh', undefined, { timeout: 10_000 })
    .then((res) => {
      setAccessToken(res.data.accessToken);
      return res.data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function handleRefreshFailure(err: unknown): void {
  if (isAuthUncertain(err)) {
    onUncertainCallback?.();
    return;
  }
  setAccessToken(null);
  onUnauthorizedCallback?.();
}

// Renovar antes de que venza y solo después poner Authorization: vencido, hasta las rutas públicas dan 401
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (
    inMemoryAccessToken &&
    tokenExpiresSoon(inMemoryAccessToken) &&
    !config.url?.includes('/auth/')
  ) {
    try {
      await refreshSession();
    } catch (err) {
      handleRefreshFailure(err);
    }
  }
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

    try {
      const data = await refreshSession();
      originalRequest.headers.set('Authorization', `Bearer ${data.accessToken}`);
      return apiClient(originalRequest);
    } catch (refreshErr) {
      handleRefreshFailure(refreshErr);
      return Promise.reject(error);
    }
  }
);
