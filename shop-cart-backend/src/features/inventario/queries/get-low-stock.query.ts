import { IQueryHandler } from '@/core/cqrs/index';
import { IInventoryRepository } from '../abstracts/inventario.repository.interface';
import { GetLowStockQuery, LowStockResult } from '../models/existencias-bajas.model';
import { InventoryRepository } from '../repository/inventario.repository';

export class GetLowStockQueryHandler implements IQueryHandler<GetLowStockQuery, LowStockResult> {
  constructor(private readonly repo: IInventoryRepository = new InventoryRepository()) {}

  async handle(query: GetLowStockQuery): Promise<LowStockResult> {
    return this.repo.getLowStock(query.q, query.pagina, query.tamanoPagina);
  }
}
