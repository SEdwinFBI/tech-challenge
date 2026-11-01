import { ICommandHandler } from '@/core/cqrs/index';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { UpdateProductCommand, UpdateProductResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class UpdateProductCommandHandler implements ICommandHandler<UpdateProductCommand, UpdateProductResult> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: UpdateProductCommand): Promise<UpdateProductResult> {
    const data = await this.repo.updateProduct(cmd);

    sseCacheManager.invalidateAndBroadcast('CATALOGO_ACTUALIZADO', {
      accion: 'ACTUALIZAR_PRODUCTO',
      idProducto: cmd.idProducto,
    });

    return data;
  }
}
