import { BitacoraResult, GetBitacoraQuery } from '../models/bitacora.schema';

export interface IBitacoraRepository {
  getBitacora(filtro: GetBitacoraQuery): Promise<BitacoraResult>;
}
