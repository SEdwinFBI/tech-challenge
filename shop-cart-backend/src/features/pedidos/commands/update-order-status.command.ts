import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { IOrdersRepository } from '../abstracts/pedidos.repository.interface';
import { OrderStatePolicy } from '../domain/order-state.machine';
import { UpdateOrderStatusCommand, UpdateOrderStatusResult } from '../models/pedidos.schema';
import { OrdersRepository } from '../repository/pedidos.repository';

export class UpdateOrderStatusCommandHandler implements ICommandHandler<UpdateOrderStatusCommand, UpdateOrderStatusResult> {
  constructor(
    private readonly repo: IOrdersRepository = new OrdersRepository(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
  ) {}

  async handle(cmd: UpdateOrderStatusCommand): Promise<UpdateOrderStatusResult> {
    const agregado = await this.repo.getById(cmd.idPedido);
    if (!agregado) throw new DomainError('El pedido no existe.', 'ORDER_NOT_FOUND', 404);

    if (cmd.ejecutor.rol === 'CLIENTE' && agregado.pedido.IDUsuario !== cmd.ejecutor.idUsuario) {
      throw new DomainError('El pedido no existe.', 'ORDER_NOT_FOUND', 404);
    }

    OrderStatePolicy.ensureValidTransition(agregado.pedido.Estado, cmd.nuevoEstado, cmd.ejecutor.rol);

    await this.repo.updateStatus({
      idPedido: cmd.idPedido,
      nuevoEstado: cmd.nuevoEstado,
      idUsuario: cmd.ejecutor.idUsuario,
      rolUsuario: cmd.ejecutor.rol,
      comentario: cmd.comentario,
    });

    await this.events.publish({ tipo: 'CAMBIO_ESTADO_PEDIDO', payload: { idPedido: cmd.idPedido, estado: cmd.nuevoEstado } });
    return { idPedido: cmd.idPedido, estado: cmd.nuevoEstado };
  }
}
