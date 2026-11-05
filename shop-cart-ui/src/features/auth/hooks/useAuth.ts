import { create } from 'zustand';
import { User } from '@/shared/types/domain';
import { authApi } from '../api/authApi';
import { setAccessToken, setOnUnauthorizedCallback } from '@/shared/lib/apiClient';
import { toast } from '@/shared/ui/toastStore';
import { isNetworkError } from '@/shared/lib/apiErrors';
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
  status: 'initializing' | 'authenticated' | 'unauthenticated';
  initializeAuth: () => Promise<void>;
  login: (correo: string, pass: string) => Promise<User>;
  register: (correo: string, pass: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
}

// Una renovación a la vez: en dev, StrictMode ejecuta los efectos dos veces.
// Con rotación, reusar el mismo refresh token cierra la sesión.
let initPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: 'initializing',

  initializeAuth: () => {
    if (!initPromise) {
      initPromise = (async () => {
        if (!haySesionGuardada()) {
          set({ user: null, status: 'unauthenticated' });
          return;
        }
        try {
          const data = await authApi.refresh();
          claimDrafts(data.usuario.idUsuario);
          set({ user: data.usuario, status: 'authenticated' });
        } catch (err) {
          if (isNetworkError(err)) {
            set({ user: null, status: 'unauthenticated' });
            return;
          }
          setAccessToken(null);
          recordarSesion(false);
          set({ user: null, status: 'unauthenticated' });
          toast.warning('Tu sesión caducó', 'Inicia sesión de nuevo para continuar.');
        }
      })();
    }
    return initPromise;
  },

  login: async (correo, pass) => {
    const data = await authApi.login(correo, pass);
    recordarSesion(true);
    claimDrafts(data.usuario.idUsuario);
    set({ user: data.usuario, status: 'authenticated' });
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
    recordarSesion(false);
    clearAllDrafts();
    await authApi.logout();
    set({ user: null, status: 'unauthenticated' });
  },
}));

setOnUnauthorizedCallback(() => {
  const estabaAutenticado = useAuthStore.getState().status === 'authenticated';
  recordarSesion(false);
  useAuthStore.setState({ user: null, status: 'unauthenticated' });
  if (estabaAutenticado) toast.warning('Tu sesión caducó', 'Inicia sesión de nuevo para continuar.');
});

export const useAuth = useAuthStore;
