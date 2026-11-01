import {
  GetOrdersParams,
  GetOrdersResult,
  OrderAggregate,
  ReturnOrderLineParams,
  UpdateOrderStatusParams,
} from '../models/pedidos.model';

export interface IOrdersRepository {
  getById(idPedido: number): Promise<OrderAggregate | null>;
  getAllPaginated(params: GetOrdersParams): Promise<GetOrdersResult>;
  updateStatus(params: UpdateOrderStatusParams): Promise<void>;
  processLineReturn(params: ReturnOrderLineParams): Promise<void>;
}
