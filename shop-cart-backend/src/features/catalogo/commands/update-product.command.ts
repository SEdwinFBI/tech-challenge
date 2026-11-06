import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IImageStorage } from '../abstracts/image-storage.interface';
import { UpdateProductCommand, UpdateProductResult } from '../models/catalogo.schema';
import { S3ImageStorage } from '../infrastructure/s3-image.storage';
import { CatalogRepository } from '../repository/catalogo.repository';
import { liberarImagenes } from './liberar-imagenes';
import { prepararImagenAlmacenada } from './preparar-imagen-producto';

export class UpdateProductCommandHandler implements ICommandHandler<UpdateProductCommand, UpdateProductResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
    private readonly storage: IImageStorage = new S3ImageStorage(),
  ) {}

  async handle(cmd: UpdateProductCommand): Promise<UpdateProductResult> {
    const { imagenClave, imagenUrl, ...resto } = cmd;
    const portada = imagenClave || imagenUrl
      ? await prepararImagenAlmacenada({ clave: imagenClave, url: imagenUrl }, cmd.idProducto, this.storage)
      : undefined;
    const anterior = portada ? (await this.repo.getProductByIdAdmin(cmd.idProducto)).producto?.ImagenUrl : undefined;
    const data = await this.repo.updateProduct({ ...resto, imagenUrl: portada });
    if (portada) await liberarImagenes(this.storage, [anterior], portada);

    await this.events.publish({ tipo: 'CATALOGO_ACTUALIZADO', payload: {
      accion: 'ACTUALIZAR_PRODUCTO',
      idProducto: cmd.idProducto,
    } });

    return data;
  }
}
