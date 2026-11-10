import { apiClient, setAccessToken } from '@/shared/lib/apiClient';
import { User, UserRole } from '@/shared/types/domain';
import { ApiListResponse } from '@/shared/types/api';
import type { RawUsersListResponse } from './authApi.types';

export interface AuthResponse {
  ok: boolean;
  accessToken: string;
  usuario: User;
}

export type UserSortColumn = 'fecha' | 'nombre' | 'correo' | 'rol';

export const authApi = {
  login: async (correo: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { correo, password });
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  register: async (correo: string, password: string, nombreCompleto: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', { correo, password, nombreCompleto });
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  refresh: async (): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/refresh');
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<{ ok: boolean; usuario: User }>('/auth/me');
    return res.data.usuario;
  },

  getUsers: async (params: { orden?: UserSortColumn; direccion?: 'asc' | 'desc'; pagina?: number; tamanoPagina?: number; busqueda?: string; rol?: string; activo?: boolean }): Promise<ApiListResponse<User>> => {
    const res = await apiClient.get<RawUsersListResponse>('/auth/usuarios', {
      params: {
        orden: params.orden,
        direccion: params.direccion,
        pagina: params.pagina,
        tamanoPagina: params.tamanoPagina,
        q: params.busqueda || undefined,
        rol: params.rol || undefined,
        activo: params.activo,
      },
    });
    const raw = res.data;
    const datos: User[] = (raw.datos || []).map((u) => ({
      idUsuario: (u.IDUsuario ?? u.idUsuario) as number,
      correo: (u.Correo ?? u.correo) as string,
      nombreCompleto: (u.NombreCompleto ?? u.nombreCompleto) as string,
      rol: (u.Rol ?? u.rol) as UserRole,
      activo: u.Activo ?? u.activo ?? true,
      fechaCreacion: u.FechaCreacion ?? u.fechaCreacion,
    }));
    return {
      ok: raw.ok ?? true,
      datos,
      total: raw.total ?? datos.length,
      pagina: raw.pagina ?? 1,
      tamanoPagina: raw.tamanoPagina ?? 15,
    };
  },

  updateUserRole: async (idUsuario: number, rol: UserRole): Promise<void> => {
    await apiClient.patch(`/auth/usuarios/${idUsuario}/rol`, { rol });
  },

  updateUserStatus: async (idUsuario: number, activo: boolean): Promise<void> => {
    await apiClient.patch(`/auth/usuarios/${idUsuario}/estado`, { activo });
  },

  updateProfile: async (nombreCompleto: string): Promise<User> => {
    const res = await apiClient.patch<{ ok: boolean; usuario: Record<string, unknown> }>('/auth/me', { nombreCompleto });
    const u = res.data.usuario;
    return {
      idUsuario: (u.IDUsuario ?? u.idUsuario) as number,
      correo: (u.Correo ?? u.correo) as string,
      nombreCompleto: (u.NombreCompleto ?? u.nombreCompleto) as string,
      rol: (u.Rol ?? u.rol) as UserRole,
      activo: (u.Activo ?? u.activo ?? true) as boolean,
    };
  },

  /** Revoca todas las sesiones; hay que volver a entrar. */
  changePassword: async (passwordActual: string, passwordNueva: string): Promise<void> => {
    try {
      await apiClient.post('/auth/me/password', { passwordActual, passwordNueva });
    } finally {
      // No limpia nada: quien llama decide cuándo cerrar la sesión
    }
  },
};
