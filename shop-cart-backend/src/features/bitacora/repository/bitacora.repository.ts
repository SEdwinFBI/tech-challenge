import { getDbPool, sql } from '@/core/config/db';
import { IBitacoraRepository } from '../abstracts/bitacora.repository.interface';
import { BitacoraItemDTO, BitacoraResult } from '../models/bitacora.model';

export class BitacoraRepository implements IBitacoraRepository {
  async getBitacora(
    modulo: string | null = null,
    pagina: number = 1,
    tamanoPagina: number = 20
  ): Promise<BitacoraResult> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('Modulo', sql.VarChar(50), modulo)
      .input('Pagina', sql.Int, pagina)
      .input('TamanoPagina', sql.Int, tamanoPagina)
      .execute<BitacoraItemDTO>('SP_Bitacora_Listar');

    return {
      items: result.recordset,
      totalRegistros: (result.recordsets as sql.IRecordSet<{ TotalRegistros: number }>[])[1]?.[0]?.TotalRegistros ?? 0,
    };
  }
}
