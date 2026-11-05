import { ICommandHandler } from '@/core/cqrs/index';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { UpdateProductCommand, UpdateProductResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class UpdateProductCommandHandler implements ICommandHandler<UpdateProductCommand, UpdateProductResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
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
