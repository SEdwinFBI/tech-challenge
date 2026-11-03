import { getDbPool, sql } from '@/core/config/db';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import {
  GetUsersParams,
  PaginatedUsersResult,
  RegisterClientResult,
  RotateRefreshTokenResult,
  UserEntity,
  UserListItemDTO,
  UserProfileDTO,
} from '../models/auth.model';

export class AuthRepository implements IAuthRepository {
  
  async registerClient(
    correo: string,
    passwordHash: string,
    nombreCompleto: string
  ): Promise<RegisterClientResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('Correo', sql.NVarChar(150), correo)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .input('NombreCompleto', sql.NVarChar(150), nombreCompleto)
      .execute('SP_Auth_RegistrarCliente');
    return res.recordset[0] as RegisterClientResult;
  }

  async getByEmail(correo: string): Promise<UserEntity | undefined> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('Correo', sql.NVarChar(150), correo)
      .execute('SP_Auth_ObtenerUsuarioPorCorreo');
    return res.recordset[0] as UserEntity | undefined;
  }

  async getById(idUsuario: number): Promise<UserProfileDTO | undefined> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .execute('SP_Usuarios_ObtenerPorID');
    return res.recordset[0] as UserProfileDTO | undefined;
  }

  async getUsers(params: GetUsersParams): Promise<PaginatedUsersResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('Busqueda', sql.NVarChar(150), params.q ?? null)
      .input('Rol', sql.VarChar(20), params.rol ?? null)
      .input('Activo', sql.Bit, params.activo !== undefined ? (params.activo ? 1 : 0) : null)
      .input('Orden', sql.VarChar(20), params.orden ?? 'fecha')
      .input('Direccion', sql.VarChar(4), params.direccion ?? 'desc')
      .input('Pagina', sql.Int, params.pagina)
      .input('TamanoPagina', sql.Int, params.tamanoPagina)
      .execute('SP_Usuarios_Listar');

    const items = (res.recordset ?? []) as UserListItemDTO[];
    return {
      items,
      totalRegistros: (res.recordsets as sql.IRecordSet<{ TotalRegistros: number }>[])[1]?.[0]?.TotalRegistros ?? 0,
    };
  }

  async updateUserRole(idUsuarioObjetivo: number, nuevoRol: string, idAdmin: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDUsuarioObjetivo', sql.Int, idUsuarioObjetivo)
      .input('NuevoRol', sql.VarChar(20), nuevoRol)
      .input('IDUsuarioAdmin', sql.Int, idAdmin)
      .execute('SP_Usuarios_CambiarRol');
  }

  async saveRefreshToken(
    idUsuario: number,
    tokenHash: string,
    fechaExpiracion: Date,
    familyExpiresAt?: Date
  ): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('TokenHash', sql.VarChar(255), tokenHash)
      .input('FechaExpiracion', sql.DateTime2, fechaExpiracion)
      .input('FamilyExpiresAt', sql.DateTime2, familyExpiresAt ?? null)
      .execute('SP_Auth_GuardarRefreshToken');
  }

  async rotateRefreshToken(
    hashActual: string,
    nuevoHash: string,
    nuevaExpiracion: Date
  ): Promise<RotateRefreshTokenResult | undefined> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('TokenHashActual', sql.VarChar(255), hashActual)
      .input('NuevoTokenHash', sql.VarChar(255), nuevoHash)
      .input('NuevaExpiracion', sql.DateTime2, nuevaExpiracion)
      .execute('SP_Auth_RotarRefreshToken');
    return res.recordset[0] as RotateRefreshTokenResult | undefined;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('TokenHash', sql.VarChar(255), tokenHash)
      .execute('SP_Auth_RevocarRefreshToken');
  }

  async mergeGuestCart(tokenInvitado: string, idUsuario: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('TokenInvitado', sql.VarChar(100), tokenInvitado)
      .input('IDUsuario', sql.Int, idUsuario)
      .execute('SP_Carritos_FusionarCarrito');
  }

  async updateUserStatus(idUsuario: number, activo: boolean, idAdmin: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDUsuarioObjetivo', sql.Int, idUsuario)
      .input('Activo', sql.Bit, activo ? 1 : 0)
      .input('IDUsuarioAdmin', sql.Int, idAdmin)
      .execute('SP_Usuarios_CambiarEstado');
  }

  async updateProfile(idUsuario: number, nombreCompleto: string): Promise<UserProfileDTO> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('Nombre', sql.NVarChar(150), nombreCompleto)
      .execute('SP_Usuarios_ActualizarPerfil');
    return res.recordset[0] as UserProfileDTO;
  }

  async changePassword(idUsuario: number, passwordHash: string): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .execute('SP_Usuarios_CambiarPassword');
  }
}
