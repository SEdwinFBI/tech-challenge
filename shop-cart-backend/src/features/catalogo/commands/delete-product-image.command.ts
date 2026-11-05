import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IImageStorage } from '../abstracts/image-storage.interface';
import { DeleteProductImageCommand } from '../models/catalogo.schema';
import { S3ImageStorage } from '../infrastructure/s3-image.storage';
import { CatalogRepository } from '../repository/catalogo.repository';

export class DeleteProductImageCommandHandler implements ICommandHandler<DeleteProductImageCommand, void> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly storage: IImageStorage = new S3ImageStorage(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
  ) {}

  async handle(cmd: DeleteProductImageCommand): Promise<void> {
    const url = await this.repo.deleteProductImage(cmd.idProductoImagen, cmd.idAdmin);
    if (url) await this.storage.eliminar(url);
    await this.events.publish({
      tipo: 'CATALOGO_ACTUALIZADO',
      payload: { accion: 'ELIMINAR_IMAGEN', idProductoImagen: cmd.idProductoImagen },
    });
  }
}
