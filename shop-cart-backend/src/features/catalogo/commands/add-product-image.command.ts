import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IProductImageService } from '../abstracts/product-image.service.interface';
import { AddProductImageCommand, ProductImageDTO } from '../models/catalogo.schema';
import { ProductImageService } from '../infrastructure/product-image.service';
import { CatalogRepository } from '../repository/catalogo.repository';

export class AddProductImageCommandHandler implements ICommandHandler<AddProductImageCommand, ProductImageDTO> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
    private readonly images: IProductImageService = new ProductImageService(),
  ) {}

  async handle(cmd: AddProductImageCommand): Promise<ProductImageDTO> {
    const valor = await this.images.prepare({ clave: cmd.clave, url: cmd.url }, { tipo: 'productos', id: cmd.idProducto });
    const imagen = await this.repo.addProductImage(cmd.idProducto, valor, cmd.idAdmin);
    await this.events.publish({
      tipo: 'CATALOGO_ACTUALIZADO',
      payload: { accion: 'AGREGAR_IMAGEN', idProducto: cmd.idProducto },
    });
    return imagen;
  }
}
