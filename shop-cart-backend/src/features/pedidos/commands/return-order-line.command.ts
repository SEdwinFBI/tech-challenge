import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { IOrdersRepository } from '../abstracts/pedidos.repository.interface';
import { ReturnOrderLineCommand, ReturnOrderLineResult } from '../models/pedidos.schema';
import { OrdersRepository } from '../repository/pedidos.repository';

export class ReturnOrderLineCommandHandler implements ICommandHandler<ReturnOrderLineCommand, ReturnOrderLineResult> {
  constructor(
    private readonly repo: IOrdersRepository = new OrdersRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
  ) {}

  async handle(cmd: ReturnOrderLineCommand): Promise<ReturnOrderLineResult> {
    await this.repo.processLineReturn({
      idPedido: cmd.idPedido,
      idPedidoDetalle: cmd.idPedidoDetalle,
      cantidadADevolver: cmd.cantidadADevolver,
      motivo: cmd.motivo,
      idOperador: cmd.idOperador,
    });

    await this.events.publish({ tipo: 'DEVOLUCION_PEDIDO', payload: {
      idPedido: cmd.idPedido,
      idPedidoDetalle: cmd.idPedidoDetalle,
    } });

    return { ok: true };
  }
}
