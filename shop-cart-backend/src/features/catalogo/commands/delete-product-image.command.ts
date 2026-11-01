import { ICommandHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { DeleteProductImageCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class DeleteProductImageCommandHandler implements ICommandHandler<DeleteProductImageCommand, void> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: DeleteProductImageCommand): Promise<void> {
    await this.repo.deleteProductImage(cmd.idProductoImagen, cmd.idAdmin);
  }
}
