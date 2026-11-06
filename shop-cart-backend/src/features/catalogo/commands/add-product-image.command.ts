import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IImageStorage } from '../abstracts/image-storage.interface';
import { AddProductImageCommand, ProductImageDTO } from '../models/catalogo.schema';
import { S3ImageStorage } from '../infrastructure/s3-image.storage';
import { CatalogRepository } from '../repository/catalogo.repository';
import { prepararImagenAlmacenada } from './preparar-imagen-producto';

export class AddProductImageCommandHandler implements ICommandHandler<AddProductImageCommand, ProductImageDTO> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
    private readonly storage: IImageStorage = new S3ImageStorage(),
  ) {}

  async handle(cmd: AddProductImageCommand): Promise<ProductImageDTO> {
    const valor = await prepararImagenAlmacenada({ clave: cmd.clave, url: cmd.url }, cmd.idProducto, this.storage);
    const imagen = await this.repo.addProductImage(cmd.idProducto, valor, cmd.idAdmin);
    await this.events.publish({
      tipo: 'CATALOGO_ACTUALIZADO',
      payload: { accion: 'AGREGAR_IMAGEN', idProducto: cmd.idProducto },
    });
    return imagen;
  }
}
