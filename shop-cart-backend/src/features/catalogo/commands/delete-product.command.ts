import { ICommandHandler } from '@/core/cqrs/index';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { DeleteProductCommand, DeleteProductResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class DeleteProductCommandHandler implements ICommandHandler<DeleteProductCommand, DeleteProductResult> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: DeleteProductCommand): Promise<DeleteProductResult> {
    const data = await this.repo.deleteOrDeactivateProduct(cmd.idProducto, cmd.idAdmin);

    sseCacheManager.invalidateAndBroadcast('CATALOGO_ACTUALIZADO', {
      accion: 'ELIMINAR_DESACTIVAR',
      idProducto: cmd.idProducto,
    });

    return data;
  }
}
