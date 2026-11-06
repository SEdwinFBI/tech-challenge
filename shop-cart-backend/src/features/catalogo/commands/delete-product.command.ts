import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IImageStorage } from '../abstracts/image-storage.interface';
import { DeleteProductCommand, DeleteProductResult } from '../models/catalogo.schema';
import { S3ImageStorage } from '../infrastructure/s3-image.storage';
import { CatalogRepository } from '../repository/catalogo.repository';
import { liberarImagenes } from './liberar-imagenes';

export class DeleteProductCommandHandler implements ICommandHandler<DeleteProductCommand, DeleteProductResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
    private readonly storage: IImageStorage = new S3ImageStorage(),
  ) {}

  async handle(cmd: DeleteProductCommand): Promise<DeleteProductResult> {
    const previo = await this.repo.getProductByIdAdmin(cmd.idProducto);
    const data = await this.repo.deleteOrDeactivateProduct(cmd.idProducto, cmd.idAdmin);
    if ((data as { Resultado?: string } | undefined)?.Resultado === 'ELIMINADO') {
      await liberarImagenes(this.storage, [
        previo.producto?.ImagenUrl,
        ...(previo.imagenes ?? []).map((i) => i.Url),
      ]);
    }

    await this.events.publish({ tipo: 'CATALOGO_ACTUALIZADO', payload: {
      accion: 'ELIMINAR_DESACTIVAR',
      idProducto: cmd.idProducto,
    } });

    return data;
  }
}
