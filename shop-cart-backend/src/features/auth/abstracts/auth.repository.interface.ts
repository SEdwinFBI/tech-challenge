import {
  GetUsersParams,
  PaginatedUsersResult,
  RegisterClientResult,
  RotateRefreshTokenResult,
  UserEntity,
  UserProfileDTO,
} from '../models/auth.model';

export interface IAuthRepository {
  registerClient(correo: string, passwordHash: string, nombreCompleto: string): Promise<RegisterClientResult>;
  getByEmail(correo: string): Promise<UserEntity | undefined>;
  getById(idUsuario: number): Promise<UserProfileDTO | undefined>;
  getUsers(params: GetUsersParams): Promise<PaginatedUsersResult>;
  updateUserRole(idUsuarioObjetivo: number, nuevoRol: string, idAdmin: number): Promise<void>;
  saveRefreshToken(idUsuario: number, tokenHash: string, fechaExpiracion: Date, familyExpiresAt?: Date): Promise<void>;
  rotateRefreshToken(hashActual: string, nuevoHash: string, nuevaExpiracion: Date): Promise<RotateRefreshTokenResult | undefined>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  mergeGuestCart(tokenInvitado: string, idUsuario: number): Promise<void>;
  updateUserStatus(idUsuario: number, activo: boolean, idAdmin: number): Promise<void>;
  updateProfile(idUsuario: number, nombreCompleto: string): Promise<UserProfileDTO>;
  changePassword(idUsuario: number, passwordHash: string): Promise<void>;
}
