import { IQueryHandler } from '@/core/cqrs/index';
import { BitacoraRepository } from '../repository/bitacora.repository';
import { IBitacoraRepository } from '../abstracts/bitacora.repository.interface';
import { BitacoraResult, GetBitacoraQuery } from '../models/bitacora.schema';

export class GetBitacoraQueryHandler implements IQueryHandler<GetBitacoraQuery, BitacoraResult> {
  constructor(private readonly repo: IBitacoraRepository = new BitacoraRepository()) {}

  async handle(query: GetBitacoraQuery): Promise<BitacoraResult> {
    return this.repo.getBitacora(query.modulo ?? null, query.pagina, query.tamanoPagina);
  }
}
