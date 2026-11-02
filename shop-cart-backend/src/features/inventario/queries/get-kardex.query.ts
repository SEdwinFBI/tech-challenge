import { IQueryHandler } from '@/core/cqrs/index';
import { IInventoryRepository } from '../abstracts/inventario.repository.interface';
import { GetKardexQuery, KardexResult } from '../models/inventario.schema';
import { InventoryRepository } from '../repository/inventario.repository';

export class GetKardexQueryHandler implements IQueryHandler<GetKardexQuery, KardexResult> {
  constructor(private readonly repo: IInventoryRepository = new InventoryRepository()) {}

  async handle(query: GetKardexQuery): Promise<KardexResult> {
    return this.repo.getKardex(query);
  }
}
