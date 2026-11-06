import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IProductImageService } from '../abstracts/product-image.service.interface';
import { SetCategoryImageCommand } from '../models/catalogo.schema';
import { ProductImageService } from '../infrastructure/product-image.service';
import { CatalogRepository } from '../repository/catalogo.repository';

export class SetCategoryImageCommandHandler implements ICommandHandler<SetCategoryImageCommand, void> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
    private readonly images: IProductImageService = new ProductImageService(),
  ) {}

  async handle(cmd: SetCategoryImageCommand): Promise<void> {
    const valor = cmd.url === null
      ? null
      : await this.images.prepare({ clave: cmd.clave, url: cmd.url }, { tipo: 'categorias', id: cmd.idCategoria });
    const anterior = await this.repo.updateCategoryImage(cmd.idCategoria, valor, cmd.idAdmin);
    await this.images.release([anterior], valor);
    await this.events.publish({
      tipo: 'CATALOGO_ACTUALIZADO',
      payload: { accion: 'IMAGEN_CATEGORIA', idCategoria: cmd.idCategoria },
    });
  }
}
