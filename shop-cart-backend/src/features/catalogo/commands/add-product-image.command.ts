import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { AddProductImageCommand, ProductImageDTO } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class AddProductImageCommandHandler implements ICommandHandler<AddProductImageCommand, ProductImageDTO> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
  ) {}

  async handle(cmd: AddProductImageCommand): Promise<ProductImageDTO> {
    const imagen = await this.repo.addProductImage(cmd.idProducto, cmd.url, cmd.idAdmin);
    await this.events.publish({
      tipo: 'CATALOGO_ACTUALIZADO',
      payload: { accion: 'AGREGAR_IMAGEN', idProducto: cmd.idProducto },
    });
    return imagen;
  }
}
