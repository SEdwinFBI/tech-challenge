import { DomainError } from '@/core/domain/domain.error';
import { IQueryHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { ProductDetailResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class GetProductByIdQueryHandler implements IQueryHandler<number, ProductDetailResult> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(idProducto: number): Promise<ProductDetailResult> {
    const detail = await this.repo.getProductById(idProducto);
    if (!detail.producto) throw new DomainError('El producto no existe o está inactivo.', 'PRODUCT_NOT_FOUND', 404);
    return detail;
  }
}
