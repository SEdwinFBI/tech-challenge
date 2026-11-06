import { create } from 'zustand';
import { User } from '@/shared/types/domain';
import { authApi } from '../api/authApi';
import { refreshSession, setAccessToken, setOnAuthUncertainCallback, setOnUnauthorizedCallback } from '@/shared/lib/apiClient';
import { toast } from '@/shared/ui/toastStore';
import { isAuthUncertain } from '@/shared/lib/apiErrors';
import { claimDrafts, clearAllDrafts } from '@/shared/lib/draft';

const SESSION_KEY = 'shopcart_session';

function haySesionGuardada(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function recordarSesion(activa: boolean): void {
  try {
    if (activa) localStorage.setItem(SESSION_KEY, '1');
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage no disponible */
  }
}

interface AuthState {
  user: User | null;
  status: 'initializing' | 'authenticated' | 'unauthenticated' | 'unknown';
  reconnecting: boolean;
  initializeAuth: () => Promise<void>;
  trySilentRefresh: () => Promise<boolean>;
  hasSessionHint: () => boolean;
  login: (correo: string, pass: string) => Promise<User>;
  register: (correo: string, pass: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
}

const RETRY_DELAYS_MS = [2000, 5000, 10000, 15000];

let initPromise: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let listenersAttached = false;

function stopRetries(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryAttempt = 0;
}

function scheduleRetry(): void {
  if (retryTimer || !haySesionGuardada()) return;
  const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
  retryAttempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void useAuthStore.getState().trySilentRefresh();
  }, delay);
}

function retryNow(): void {
  const { status, reconnecting } = useAuthStore.getState();
  if (status !== 'unknown' && !reconnecting) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  void useAuthStore.getState().trySilentRefresh();
}

function attachListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  window.addEventListener('online', retryNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retryNow();
  });
}

function sessionExpired(): void {
  stopRetries();
  const teniaSesion = useAuthStore.getState().status === 'authenticated' || haySesionGuardada();
  setAccessToken(null);
  recordarSesion(false);
  useAuthStore.setState({ user: null, status: 'unauthenticated', reconnecting: false });
  if (teniaSesion) toast.warning('Tu sesión caducó', 'Inicia sesión de nuevo para continuar.');
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  status: 'initializing',
  reconnecting: false,

  hasSessionHint: haySesionGuardada,

  // Una renovación a la vez: en dev, StrictMode ejecuta los efectos dos veces
  initializeAuth: () => {
    if (!initPromise) {
      attachListeners();
      initPromise = (async () => {
        if (!haySesionGuardada()) {
          set({ user: null, status: 'unauthenticated' });
          return;
        }
        await get().trySilentRefresh();
      })();
    }
    return initPromise;
  },

  trySilentRefresh: async () => {
    if (!haySesionGuardada()) {
      if (get().status !== 'authenticated') set({ user: null, status: 'unauthenticated', reconnecting: false });
      return false;
    }
    try {
      const data = await refreshSession();
      stopRetries();
      claimDrafts(data.usuario.idUsuario);
      set({ user: data.usuario, status: 'authenticated', reconnecting: false });
      return true;
    } catch (err) {
      if (isAuthUncertain(err)) {
        if (get().status === 'authenticated') set({ reconnecting: true });
        else set({ status: 'unknown', reconnecting: true });
        scheduleRetry();
        return false;
      }
      sessionExpired();
      return false;
    }
  },

  login: async (correo, pass) => {
    const data = await authApi.login(correo, pass);
    recordarSesion(true);
    claimDrafts(data.usuario.idUsuario);
    set({ user: data.usuario, status: 'authenticated', reconnecting: false });
    return data.usuario;
  },

  register: async (correo, pass, name) => {
    const data = await authApi.register(correo, pass, name);
    recordarSesion(true);
    claimDrafts(data.usuario.idUsuario);
    set({ user: data.usuario, status: 'authenticated' });
    return data.usuario;
  },

  logout: async () => {
    stopRetries();
    recordarSesion(false);
    clearAllDrafts();
    try {
      await authApi.logout();
    } finally {
      set({ user: null, status: 'unauthenticated', reconnecting: false });
    }
  },
}));

setOnUnauthorizedCallback(sessionExpired);

setOnAuthUncertainCallback(() => {
  if (!haySesionGuardada()) return;
  const { status } = useAuthStore.getState();
  if (status === 'authenticated') useAuthStore.setState({ reconnecting: true });
  else if (status === 'unauthenticated') return;
  scheduleRetry();
});

export const useAuth = useAuthStore;
