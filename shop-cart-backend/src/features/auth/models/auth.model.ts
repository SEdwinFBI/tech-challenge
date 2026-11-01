export type UserRole = 'CLIENTE' | 'OPERADOR' | 'ADMINISTRADOR';

export interface UserDTO {
  idUsuario: number;
  correo: string;
  nombreCompleto: string;
  rol: string;
}

export interface UserAccessTokenPayload {
  IDUsuario: number;
  Correo: string;
  Rol: string;
}

export interface UserSessionData {
  IDUsuario: number;
  Correo: string;
  NombreCompleto: string;
  Rol: string;
  PasswordHash?: string;
  Activo?: boolean;
}

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  usuario: UserDTO;
}

export interface UserEntity {
  IDUsuario: number;
  Correo: string;
  NombreCompleto: string;
  Rol: UserRole | string;
  PasswordHash?: string;
  Activo: boolean;
  FechaCreacion?: Date;
}

export interface UserProfileDTO {
  IDUsuario: number;
  Correo: string;
  NombreCompleto: string;
  Rol: UserRole | string;
  Activo: boolean;
  FechaCreacion: Date;
}

export interface UserListItemDTO {
  IDUsuario: number;
  Correo: string;
  NombreCompleto: string;
  Rol: UserRole | string;
  RolNombre: string;
  Activo: boolean;
  FechaCreacion: Date;
  TotalRegistros?: number;
}

export interface GetUsersParams {
  q?: string;
  rol?: UserRole | string;
  activo?: boolean;
  pagina: number;
  tamanoPagina: number;
}

export interface PaginatedUsersResult {
  items: UserListItemDTO[];
  totalRegistros: number;
}

export interface RegisterClientResult {
  IDUsuario: number;
  Correo: string;
  NombreCompleto: string;
  Rol: UserRole | string;
}

export interface RotateRefreshTokenResult {
  IDUsuario: number;
  Correo: string;
  NombreCompleto: string;
  Rol: UserRole | string;
  Activo: boolean;
}

export interface UpdateUserRoleResult {
  idUsuarioObjetivo: number;
  nuevoRol: UserRole | string;
}

export interface UpdateUserStatusResult {
  idUsuarioObjetivo: number;
  activo: boolean;
}
