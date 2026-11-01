import { ICommandHandler } from '@/core/cqrs/index';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { IOrdersRepository } from '../abstracts/pedidos.repository.interface';
import { ReturnOrderLineCommand, ReturnOrderLineResult } from '../models/pedidos.schema';
import { OrdersRepository } from '../repository/pedidos.repository';

export class ReturnOrderLineCommandHandler implements ICommandHandler<ReturnOrderLineCommand, ReturnOrderLineResult> {
  constructor(private readonly repo: IOrdersRepository = new OrdersRepository()) {}

  async handle(cmd: ReturnOrderLineCommand): Promise<ReturnOrderLineResult> {
    await this.repo.processLineReturn({
      idPedido: cmd.idPedido,
      idPedidoDetalle: cmd.idPedidoDetalle,
      cantidadADevolver: cmd.cantidadADevolver,
      motivo: cmd.motivo,
      idOperador: cmd.idOperador,
    });

    sseCacheManager.invalidateAndBroadcast('DEVOLUCION_PEDIDO', {
      idPedido: cmd.idPedido,
      idPedidoDetalle: cmd.idPedidoDetalle,
    });

    return { ok: true };
  }
}
