import { CreateMovementParams, CreateMovementResult, GetKardexParams, KardexResult } from '../models/inventario.model';
import { GetLowStockQuery, LowStockResult } from '../models/existencias-bajas.model';

export interface IInventoryRepository {
  createMovement(params: CreateMovementParams): Promise<CreateMovementResult>;
  getKardex(params: GetKardexParams): Promise<KardexResult>;
  getLowStock(params: GetLowStockQuery): Promise<LowStockResult>;
}
