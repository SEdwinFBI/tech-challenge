import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { SaveCategoryCommand, SaveCategoryResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class SaveCategoryCommandHandler implements ICommandHandler<SaveCategoryCommand, SaveCategoryResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
  ) {}

  async handle(cmd: SaveCategoryCommand): Promise<SaveCategoryResult> {
    const data = await this.repo.saveCategory(cmd);
    await this.events.publish({ tipo: 'CATALOGO_CATEGORIA_ACTUALIZADA', payload: {
      idCategoria: cmd.idCategoria ?? data?.IDCategoria,
      nombre: cmd.nombre,
    } });
    return data;
  }
}
