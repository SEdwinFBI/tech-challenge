import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { SetFeaturedCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class SetFeaturedCommandHandler implements ICommandHandler<SetFeaturedCommand, void> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
  ) {}

  async handle(cmd: SetFeaturedCommand): Promise<void> {
    await this.repo.setFeatured(cmd.idProducto, cmd.destacado, cmd.idAdmin);
    await this.events.publish({
      tipo: 'CATALOGO_ACTUALIZADO',
      payload: { accion: 'DESTACAR_PRODUCTO', idProducto: cmd.idProducto, destacado: cmd.destacado },
    });
  }
}
