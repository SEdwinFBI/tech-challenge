import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { DeleteProductCommand, DeleteProductResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class DeleteProductCommandHandler implements ICommandHandler<DeleteProductCommand, DeleteProductResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
  ) {}

  async handle(cmd: DeleteProductCommand): Promise<DeleteProductResult> {
    const data = await this.repo.deleteOrDeactivateProduct(cmd.idProducto, cmd.idAdmin);

    await this.events.publish({ tipo: 'CATALOGO_ACTUALIZADO', payload: {
      accion: 'ELIMINAR_DESACTIVAR',
      idProducto: cmd.idProducto,
    } });

    return data;
  }
}
