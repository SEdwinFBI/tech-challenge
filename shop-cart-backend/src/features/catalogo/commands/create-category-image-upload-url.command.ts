import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IImageStorage, UrlSubidaImagen } from '../abstracts/image-storage.interface';
import { CreateCategoryImageUploadUrlCommand } from '../models/catalogo.schema';
import { S3ImageStorage } from '../infrastructure/s3-image.storage';
import { CatalogRepository } from '../repository/catalogo.repository';

export class CreateCategoryImageUploadUrlCommandHandler
  implements ICommandHandler<CreateCategoryImageUploadUrlCommand, UrlSubidaImagen>
{
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly storage: IImageStorage = new S3ImageStorage(),
  ) {}

  async handle(cmd: CreateCategoryImageUploadUrlCommand): Promise<UrlSubidaImagen> {
    const categorias = await this.repo.getCategories(false);
    if (!categorias.some((c) => c.IDCategoria === cmd.idCategoria)) {
      throw new DomainError('La categoría no existe.', 'CATEGORY_NOT_FOUND', 404);
    }

    if (!this.storage.disponible()) {
      throw new DomainError(
        'El almacenamiento de imágenes no está configurado.',
        'ALMACENAMIENTO_NO_CONFIGURADO',
        503,
      );
    }

    return this.storage.crearUrlSubida({ tipo: 'categorias', id: cmd.idCategoria }, cmd.contentType, cmd.tamanoBytes);
  }
}
