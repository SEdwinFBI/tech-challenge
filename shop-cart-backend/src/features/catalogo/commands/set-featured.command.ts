import { ICommandHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { SetFeaturedCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class SetFeaturedCommandHandler implements ICommandHandler<SetFeaturedCommand, void> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: SetFeaturedCommand): Promise<void> {
    await this.repo.setFeatured(cmd.idProducto, cmd.destacado, cmd.idAdmin);
  }
}
