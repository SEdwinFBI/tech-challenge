import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { SetCategoryImageCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class SetCategoryImageCommandHandler implements ICommandHandler<SetCategoryImageCommand, void> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
  ) {}

  async handle(cmd: SetCategoryImageCommand): Promise<void> {
    await this.repo.updateCategoryImage(cmd.idCategoria, cmd.imagenUrl, cmd.idAdmin);
    await this.events.publish({
      tipo: 'CATALOGO_ACTUALIZADO',
      payload: { accion: 'IMAGEN_CATEGORIA', idCategoria: cmd.idCategoria },
    });
  }
}
