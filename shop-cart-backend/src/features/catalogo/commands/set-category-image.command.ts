import { ICommandHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { SetCategoryImageCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class SetCategoryImageCommandHandler implements ICommandHandler<SetCategoryImageCommand, void> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: SetCategoryImageCommand): Promise<void> {
    await this.repo.updateCategoryImage(cmd.idCategoria, cmd.imagenUrl, cmd.idAdmin);
  }
}
