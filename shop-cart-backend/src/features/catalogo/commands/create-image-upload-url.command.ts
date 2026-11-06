import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IImageStorage, UrlSubidaImagen } from '../abstracts/image-storage.interface';
import { CreateImageUploadUrlCommand } from '../models/catalogo.schema';
import { S3ImageStorage } from '../infrastructure/s3-image.storage';
import { CatalogRepository } from '../repository/catalogo.repository';

export class CreateImageUploadUrlCommandHandler
  implements ICommandHandler<CreateImageUploadUrlCommand, UrlSubidaImagen>
{
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly storage: IImageStorage = new S3ImageStorage(),
  ) {}

  async handle(cmd: CreateImageUploadUrlCommand): Promise<UrlSubidaImagen> {
    const detalle = await this.repo.getProductByIdAdmin(cmd.idProducto);
    if (!detalle.producto) throw new DomainError('El producto no existe.', 'PRODUCT_NOT_FOUND', 404);

    if (!this.storage.disponible()) {
      throw new DomainError(
        'El almacenamiento de imágenes no está configurado.',
        'ALMACENAMIENTO_NO_CONFIGURADO',
        503,
      );
    }

    return this.storage.crearUrlSubida({ tipo: 'productos', id: cmd.idProducto }, cmd.contentType, cmd.tamanoBytes);
  }
}
