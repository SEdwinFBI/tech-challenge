import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IProductImageService } from '../abstracts/product-image.service.interface';
import { UpdateProductCommand, UpdateProductResult } from '../models/catalogo.schema';
import { ProductImageService } from '../infrastructure/product-image.service';
import { CatalogRepository } from '../repository/catalogo.repository';

export class UpdateProductCommandHandler implements ICommandHandler<UpdateProductCommand, UpdateProductResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
    private readonly images: IProductImageService = new ProductImageService(),
  ) {}

  async handle(cmd: UpdateProductCommand): Promise<UpdateProductResult> {
    const { imagenClave, imagenUrl, ...resto } = cmd;
    const portada = imagenClave || imagenUrl
      ? await this.images.prepare({ clave: imagenClave, url: imagenUrl }, cmd.idProducto)
      : undefined;
    const anterior = portada ? (await this.repo.getProductByIdAdmin(cmd.idProducto)).producto?.ImagenUrl : undefined;
    const data = await this.repo.updateProduct({ ...resto, imagenUrl: portada });
    if (portada) await this.images.release([anterior], portada);

    await this.events.publish({ tipo: 'CATALOGO_ACTUALIZADO', payload: {
      accion: 'ACTUALIZAR_PRODUCTO',
      idProducto: cmd.idProducto,
    } });

    return data;
  }
}
