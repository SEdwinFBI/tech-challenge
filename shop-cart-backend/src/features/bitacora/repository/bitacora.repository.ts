import { getDbPool, sql } from '@/core/config/db';
import { IBitacoraRepository } from '../abstracts/bitacora.repository.interface';
import { BitacoraItemDTO, BitacoraResult } from '../models/bitacora.model';
import { GetBitacoraQuery } from '../models/bitacora.schema';

export class BitacoraRepository implements IBitacoraRepository {
  async getBitacora(f: GetBitacoraQuery): Promise<BitacoraResult> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('Modulo', sql.VarChar(50), f.modulo || null)
      .input('Pagina', sql.Int, f.pagina)
      .input('TamanoPagina', sql.Int, f.tamanoPagina)
      .input('Orden', sql.VarChar(20), f.orden)
      .input('Direccion', sql.VarChar(4), f.direccion)
      .input('Accion', sql.VarChar(50), f.accion || null)
      .input('Busqueda', sql.NVarChar(150), f.busqueda || null)
      .input('FechaDesde', sql.DateTime2, f.fechaDesde ?? null)
      .input('FechaHasta', sql.DateTime2, f.fechaHasta ?? null)
      .execute<BitacoraItemDTO>('SP_Bitacora_Listar');

    return {
      items: result.recordset,
      totalRegistros: (result.recordsets as sql.IRecordSet<{ TotalRegistros: number }>[])[1]?.[0]?.TotalRegistros ?? 0,
    };
  }
}
