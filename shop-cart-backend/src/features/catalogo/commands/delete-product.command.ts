import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IProductImageService } from '../abstracts/product-image.service.interface';
import { DeleteProductCommand, DeleteProductResult } from '../models/catalogo.schema';
import { ProductImageService } from '../infrastructure/product-image.service';
import { CatalogRepository } from '../repository/catalogo.repository';

export class DeleteProductCommandHandler implements ICommandHandler<DeleteProductCommand, DeleteProductResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
    private readonly images: IProductImageService = new ProductImageService(),
  ) {}

  async handle(cmd: DeleteProductCommand): Promise<DeleteProductResult> {
    const previo = await this.repo.getProductByIdAdmin(cmd.idProducto);
    const data = await this.repo.deleteOrDeactivateProduct(cmd.idProducto, cmd.idAdmin);
    if ((data as { Resultado?: string } | undefined)?.Resultado === 'ELIMINADO') {
      await this.images.release([
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
