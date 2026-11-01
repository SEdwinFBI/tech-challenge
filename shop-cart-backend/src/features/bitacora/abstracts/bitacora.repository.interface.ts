import { BitacoraResult, GetBitacoraQuery } from '../models/bitacora.schema';

export interface IBitacoraRepository {
  getBitacora(
    modulo?: GetBitacoraQuery['modulo'],
    pagina?: GetBitacoraQuery['pagina'],
    tamanoPagina?: GetBitacoraQuery['tamanoPagina']
  ): Promise<BitacoraResult>;
}
