import { CreateMovementParams, CreateMovementResult, KardexResult } from '../models/inventario.model';
import { LowStockResult } from '../models/existencias-bajas.model';

export interface IInventoryRepository {
  createMovement(params: CreateMovementParams): Promise<CreateMovementResult>;
  getKardex(idVariante?: number, pagina?: number, tamanoPagina?: number): Promise<KardexResult>;
  getLowStock(q: string | undefined, pagina: number, tamanoPagina: number): Promise<LowStockResult>;
}
