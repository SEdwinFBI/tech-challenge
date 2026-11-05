import { DomainError } from '@/core/domain/domain.error';
import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { SetReferencePriceCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class SetReferencePriceCommandHandler implements ICommandHandler<SetReferencePriceCommand, void> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
  ) {}

  async handle(cmd: SetReferencePriceCommand): Promise<void> {
    if (cmd.precioReferencia !== null && !(cmd.precioReferencia > 0)) {
      throw new DomainError('El precio de referencia debe ser mayor a cero.', 'INVALID_REFERENCE_PRICE', 400);
    }
    await this.repo.setReferencePrice(cmd.idVariante, cmd.precioReferencia, cmd.idAdmin);
    await this.events.publish({
      tipo: 'CATALOGO_ACTUALIZADO',
      payload: { accion: 'PRECIO_REFERENCIA', idVariante: cmd.idVariante },
    });
  }
}
