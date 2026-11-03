import { getDbPool, sql } from '@/core/config/db';
import { IInventoryRepository } from '../abstracts/inventario.repository.interface';
import { CreateMovementParams, CreateMovementResult, GetKardexParams, KardexResult } from '../models/inventario.model';
import { GetLowStockQuery, LowStockItemDTO, LowStockResult } from '../models/existencias-bajas.model';

export class InventoryRepository implements IInventoryRepository {
  async createMovement(params: CreateMovementParams): Promise<CreateMovementResult> {
    const pool = await getDbPool();
    const idUsuario = params.idUsuario ?? params.idUsuarioOperador ?? 0;
    const res = await pool
      .request()
      .input('IDVariante', sql.Int, params.idVariante)
      .input('IDUsuario', sql.Int, idUsuario)
      .input('TipoMovimiento', sql.VarChar(30), params.tipoMovimiento)
      .input('Cantidad', sql.Int, params.cantidad)
      .input('Motivo', sql.NVarChar(300), params.motivo)
      .execute('SP_Inventario_RegistrarMovimiento');
    return res.recordset[0];
  }

  async getKardex(params: GetKardexParams): Promise<KardexResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDVariante', sql.Int, params.idVariante ?? null)
      .input('TipoMovimiento', sql.VarChar(30), params.tipoMovimiento || null)
      .input('FechaDesde', sql.DateTime2, params.fechaDesde ?? null)
      .input('FechaHasta', sql.DateTime2, params.fechaHasta ?? null)
      .input('Orden', sql.VarChar(20), params.orden ?? 'fecha')
      .input('Direccion', sql.VarChar(4), params.direccion ?? 'desc')
      .input('Pagina', sql.Int, params.pagina)
      .input('TamanoPagina', sql.Int, params.tamanoPagina)
      .execute('SP_Inventario_ListarKardex');

    return {
      items: res.recordset,
      totalRegistros: (res.recordsets as sql.IRecordSet<{ TotalRegistros: number }>[])[1]?.[0]?.TotalRegistros ?? 0,
    };
  }

  async getLowStock(params: GetLowStockQuery): Promise<LowStockResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('Busqueda', sql.NVarChar(150), params.q ?? null)
      .input('Orden', sql.VarChar(20), params.orden)
      .input('Direccion', sql.VarChar(4), params.direccion)
      .input('Pagina', sql.Int, params.pagina)
      .input('TamanoPagina', sql.Int, params.tamanoPagina)
      .execute<LowStockItemDTO>('SP_Inventario_ListarExistenciasBajas');

    return {
      items: res.recordset,
      totalRegistros: (res.recordsets as sql.IRecordSet<{ TotalRegistros: number }>[])[1]?.[0]?.TotalRegistros ?? 0,
    };
  }
}
