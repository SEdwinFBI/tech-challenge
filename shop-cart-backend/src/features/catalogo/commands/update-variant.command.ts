import { ICommandHandler } from '@/core/cqrs/index';
import { Money } from '@/core/domain/money.vo';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { UpdateVariantCommand, UpdateVariantResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class UpdateVariantCommandHandler implements ICommandHandler<UpdateVariantCommand, UpdateVariantResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
  ) {}

  async handle(cmd: UpdateVariantCommand): Promise<UpdateVariantResult> {
    const precio = cmd.precio !== undefined ? Money.fromDecimal(cmd.precio).value : undefined;

    const data = await this.repo.updateVariant({
      ...cmd,
      precio,
    });

    await this.events.publish({ tipo: 'CATALOGO_ACTUALIZADO', payload: {
      accion: 'ACTUALIZAR_VARIANTE',
      idVariante: cmd.idVariante,
    } });

    return data;
  }
}
