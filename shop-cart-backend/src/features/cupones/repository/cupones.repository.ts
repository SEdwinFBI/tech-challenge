import { getDbPool, sql } from '@/core/config/db';
import { ICouponsRepository } from '../abstracts/cupones.repository.interface';
import {
  ApplyCouponResult,
  CouponDTO,
  GetCouponsFilter,
  RemoveCouponResult,
  SaveCouponParams,
  SaveCouponResult,
} from '../models/cupones.model';

export class CouponsRepository implements ICouponsRepository {
  async getAll(f: GetCouponsFilter = {}): Promise<CouponDTO[]> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('Orden', sql.VarChar(20), f.orden ?? 'fecha')
      .input('Direccion', sql.VarChar(4), f.direccion ?? 'desc')
      .input('Busqueda', sql.NVarChar(50), f.q || null)
      .input('Activo', sql.Bit, f.activo === undefined ? null : f.activo ? 1 : 0)
      .input('Vigencia', sql.VarChar(12), f.vigencia ?? null)
      .execute<CouponDTO>('SP_Cupones_Listar');
    return res.recordset;
  }

  async applyToCart(idUsuario: number, codigoCupon: string): Promise<ApplyCouponResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('CodigoCupon', sql.VarChar(50), codigoCupon.trim().toUpperCase())
      .execute<ApplyCouponResult>('SP_Cupones_AplicarAlCarrito');
    return res.recordset[0] as ApplyCouponResult;
  }

  async removeFromCart(idUsuario: number): Promise<RemoveCouponResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .execute<RemoveCouponResult>('SP_Cupones_RemoverDelCarrito');
    return res.recordset[0] as RemoveCouponResult;
  }

  async saveCoupon(dto: SaveCouponParams): Promise<SaveCouponResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDCupon', sql.Int, dto.idCupon ?? null)
      .input('Codigo', sql.VarChar(50), dto.codigo.trim().toUpperCase())
      .input('TipoDescuento', sql.VarChar(20), dto.tipoDescuento)
      .input('Valor', sql.Decimal(12, 2), dto.valor)
      .input('MontoMinimoCompra', sql.Decimal(12, 2), dto.montoMinimoCompra)
      .input('LimiteTotalUsos', sql.Int, dto.limiteTotalUsos)
      .input('LimiteUsosPorCliente', sql.Int, dto.limiteUsosPorCliente)
      .input('IDCategoriaAplica', sql.Int, dto.idCategoriaAplica ?? null)
      .input('FechaInicio', sql.DateTime2, dto.fechaInicio)
      .input('FechaFin', sql.DateTime2, dto.fechaFin)
      .input('Activo', sql.Bit, dto.activo ? 1 : 0)
      .input('IDUsuarioAdmin', sql.Int, dto.idAdmin)
      .execute<SaveCouponResult>('SP_Cupones_CrearActualizar');
    return res.recordset[0] as SaveCouponResult;
  }
}
