import { DomainError } from '@/core/domain/domain.error';
import { IQueryHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { ProductImageDTO } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class GetProductImagesQueryHandler implements IQueryHandler<number, ProductImageDTO[]> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(idProducto: number): Promise<ProductImageDTO[]> {
    const imagenes = await this.repo.getProductImages(idProducto);
    if (imagenes.length === 0) {
      const detalle = await this.repo.getProductById(idProducto);
      if (!detalle.producto) throw new DomainError('El producto no existe o está inactivo.', 'PRODUCT_NOT_FOUND', 404);
    }
    return imagenes;
  }
}
