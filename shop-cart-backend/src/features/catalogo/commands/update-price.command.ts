import { ICommandHandler } from '@/core/cqrs/index';
import { Money } from '@/core/domain/money.vo';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { UpdatePriceCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class UpdatePriceCommandHandler implements ICommandHandler<UpdatePriceCommand, void> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
  ) {}

  async handle(cmd: UpdatePriceCommand): Promise<void> {
    const precioVO = Money.fromDecimal(cmd.nuevoPrecio);
    await this.repo.updateVariantPrice(cmd.idVariante, precioVO.value, cmd.idAdmin);

    await this.events.publish({ tipo: 'CATALOGO_ACTUALIZADO', payload: {
      accion: 'ACTUALIZAR_PRECIO',
      idVariante: cmd.idVariante,
      nuevoPrecio: precioVO.value,
    } });
  }
}
