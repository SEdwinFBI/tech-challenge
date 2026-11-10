import type { UserRole } from '@/shared/types/domain';

export interface RawUser {
  IDUsuario?: number;
  idUsuario?: number;
  Correo?: string;
  correo?: string;
  NombreCompleto?: string;
  nombreCompleto?: string;
  Rol?: UserRole;
  rol?: UserRole;
  Activo?: boolean;
  activo?: boolean;
  FechaCreacion?: string;
  fechaCreacion?: string;
}

export interface RawUsersListResponse {
  ok?: boolean;
  datos?: RawUser[];
  total?: number;
  pagina?: number;
  tamanoPagina?: number;
}
