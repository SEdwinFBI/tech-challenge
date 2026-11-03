import { getDbPool, sql } from '@/core/config/db';
import { env } from '@/core/config/env';
import { ICheckoutRepository } from '../abstracts/checkout.repository.interface';
import {
  AddressDTO,
  ConfirmOrderParams,
  ConfirmOrderResult,
  CreateAddressParams,
  DeleteAddressResult,
  MunicipalityDTO,
  ReserveStockResult,
} from '../models/checkout.model';

export class CheckoutRepository implements ICheckoutRepository {
  async getMunicipalities(): Promise<MunicipalityDTO[]> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('Accion', sql.VarChar(10), 'CATALOGO')
      .execute('SP_Direcciones_CrearListar');
    return res.recordset as MunicipalityDTO[];
  }

  async getAddresses(idUsuario: number): Promise<AddressDTO[]> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('Accion', sql.VarChar(10), 'LISTAR')
      .execute('SP_Direcciones_CrearListar');
    return res.recordset as AddressDTO[];
  }

  async createAddress(dto: CreateAddressParams): Promise<AddressDTO[]> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, dto.idUsuario)
      .input('Accion', sql.VarChar(10), 'CREAR')
      .input('Etiqueta', sql.NVarChar(50), dto.etiqueta)
      .input('IDMunicipio', sql.Int, dto.idMunicipio ?? null)
      .input('IDTarifaEnvio', sql.Int, dto.idTarifaEnvio ?? null)
      .input('Municipio', sql.NVarChar(100), dto.municipio ?? null)
      .input('DireccionExacta', sql.NVarChar(300), dto.direccionExacta)
      .input('TelefonoContacto', sql.VarChar(20), dto.telefonoContacto)
      .input('Predeterminada', sql.Bit, dto.predeterminada ? 1 : 0)
      .execute('SP_Direcciones_CrearListar');
    return res.recordset as AddressDTO[];
  }

  async deleteAddress(idDireccion: number, idUsuario: number): Promise<DeleteAddressResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('IDDireccion', sql.Int, idDireccion)
      .input('Accion', sql.VarChar(10), 'ELIMINAR')
      .execute('SP_Direcciones_CrearListar');
    return res.recordset as DeleteAddressResult;
  }

  async setDefaultAddress(idDireccion: number, idUsuario: number): Promise<AddressDTO[]> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('IDDireccion', sql.Int, idDireccion)
      .execute('SP_Direcciones_MarcarPredeterminada');
    return this.getAddresses(idUsuario);
  }

  async reserveStock(idUsuario: number, idCarrito: number): Promise<ReserveStockResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('IDCarrito', sql.Int, idCarrito)
      .input('DuracionMinutos', sql.Int, env.RESERVATION_TTL_MINUTES ?? null)
      .execute('SP_Inventario_ReservarExistencia');
    return res.recordset[0] as ReserveStockResult;
  }

  async confirmOrder(dto: ConfirmOrderParams): Promise<ConfirmOrderResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, dto.idUsuario)
      .input('IDCarrito', sql.Int, dto.idCarrito)
      .input('IDDireccion', sql.Int, dto.idDireccion)
      .input('ClaveIdempotencia', sql.VarChar(100), dto.claveIdempotencia)
      .input('SimularFalloPago', sql.Bit, dto.simularFalloPago ? 1 : 0)
      .execute('SP_Pedidos_CrearPedido');
    return res.recordset[0] as ConfirmOrderResult;
  }
}
