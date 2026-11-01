import { IQueryHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { CategoryDTO } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class GetCategoriesQueryHandler implements IQueryHandler<boolean, CategoryDTO[]> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(soloActivas: boolean): Promise<CategoryDTO[]> {
    return this.repo.getCategories(soloActivas);
  }
}
