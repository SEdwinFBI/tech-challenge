import { IQueryHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { AuthUser } from '@/core/middlewares/auth.middleware';
import { IOrdersRepository } from '../abstracts/pedidos.repository.interface';
import { GetOrderByIdQuery, OrderAggregate } from '../models/pedidos.schema';
import { OrdersRepository } from '../repository/pedidos.repository';

export class GetOrderByIdQueryHandler implements IQueryHandler<GetOrderByIdQuery, OrderAggregate> {
  constructor(private readonly repo: IOrdersRepository = new OrdersRepository()) {}

  async handle(query: GetOrderByIdQuery): Promise<OrderAggregate> {
    return this.getSecureDetail(query.idPedido, query.solicitante);
  }

  async getSecureDetail(idPedido: number, solicitante: AuthUser): Promise<OrderAggregate> {
    const data = await this.repo.getById(idPedido);
    if (!data) throw new DomainError('Pedido no encontrado.', 'ORDER_NOT_FOUND', 404);
    if (solicitante.rol === 'CLIENTE' && data.pedido.IDUsuario !== solicitante.idUsuario) {
      throw new DomainError('Pedido no encontrado.', 'ORDER_NOT_FOUND', 404);
    }
    return data;
  }
}
