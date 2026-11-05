import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { UpdateProductCommand, UpdateProductResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class UpdateProductCommandHandler implements ICommandHandler<UpdateProductCommand, UpdateProductResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
  ) {}

  async handle(cmd: UpdateProductCommand): Promise<UpdateProductResult> {
    const data = await this.repo.updateProduct(cmd);

    await this.events.publish({ tipo: 'CATALOGO_ACTUALIZADO', payload: {
      accion: 'ACTUALIZAR_PRODUCTO',
      idProducto: cmd.idProducto,
    } });

    return data;
  }
}
