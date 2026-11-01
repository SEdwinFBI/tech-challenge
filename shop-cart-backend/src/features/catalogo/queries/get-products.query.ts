import { IQueryHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { GetProductsQuery, PaginatedProductsResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class GetProductsQueryHandler implements IQueryHandler<GetProductsQuery, PaginatedProductsResult> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(query: GetProductsQuery): Promise<PaginatedProductsResult> {
    const { rolUsuario, ...filtros } = query;
    return this.repo.getProducts({
      ...filtros,
      soloDisponibles: filtros.soloDisponibles === 'true',
      soloOfertas: filtros.soloOfertas === 'true',
      soloNuevos: filtros.soloNuevos === 'true',
      soloDestacados: filtros.soloDestacados === 'true',
      incluirInactivos: rolUsuario === 'ADMINISTRADOR',
    });
  }
}
