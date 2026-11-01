import { ICommandHandler } from '@/core/cqrs/index';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { SaveCategoryCommand, SaveCategoryResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class SaveCategoryCommandHandler implements ICommandHandler<SaveCategoryCommand, SaveCategoryResult> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: SaveCategoryCommand): Promise<SaveCategoryResult> {
    const data = await this.repo.saveCategory(cmd);
    sseCacheManager.invalidateAndBroadcast('CATALOGO_CATEGORIA_ACTUALIZADA', {
      idCategoria: cmd.idCategoria ?? data?.IDCategoria,
      nombre: cmd.nombre,
    });
    return data;
  }
}
