import { ICommandHandler } from '@/core/cqrs/index';
import { Money } from '@/core/domain/money.vo';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { CreateVariantCommand, CreateVariantResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class CreateVariantCommandHandler implements ICommandHandler<CreateVariantCommand, CreateVariantResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
  ) {}

  async handle(cmd: CreateVariantCommand): Promise<CreateVariantResult> {
    const precioVO = Money.fromDecimal(cmd.precio);
    const data = await this.repo.createVariant({
      ...cmd,
      precio: precioVO.value,
    });

    await this.events.publish({ tipo: 'CATALOGO_ACTUALIZADO', payload: {
      accion: 'CREAR_VARIANTE',
      idProducto: cmd.idProducto,
      idVariante: data?.IDVariante,
    } });

    return data;
  }
}
