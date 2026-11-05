import { ICommandHandler } from '@/core/cqrs/index';
import { Money } from '@/core/domain/money.vo';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { CreateProductCommand, CreateProductResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class CreateProductCommandHandler implements ICommandHandler<CreateProductCommand, CreateProductResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
  ) {}

  async handle(cmd: CreateProductCommand): Promise<CreateProductResult> {
    const precioVO = Money.fromDecimal(cmd.precio);
    const data = await this.repo.createProductWithVariant({
      ...cmd,
      precio: precioVO.value,
    });

    await this.events.publish({ tipo: 'CATALOGO_ACTUALIZADO', payload: {
      accion: 'CREAR_PRODUCTO',
      idProducto: data?.IDProducto,
    } });

    return data;
  }
}
