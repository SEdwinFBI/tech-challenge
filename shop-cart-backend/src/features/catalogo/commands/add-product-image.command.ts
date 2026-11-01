import { ICommandHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { AddProductImageCommand, ProductImageDTO } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class AddProductImageCommandHandler implements ICommandHandler<AddProductImageCommand, ProductImageDTO> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: AddProductImageCommand): Promise<ProductImageDTO> {
    return this.repo.addProductImage(cmd.idProducto, cmd.url, cmd.idAdmin);
  }
}
