import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { Money } from '@/core/domain/money.vo';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { ApplyOfferCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class ApplyOfferCommandHandler implements ICommandHandler<ApplyOfferCommand, void> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
  ) {}

  async handle(cmd: ApplyOfferCommand): Promise<void> {
    const ids = new Set(cmd.variantes.map((v) => v.idVariante));
    if (ids.size !== cmd.variantes.length) {
      throw new DomainError('Una variante no puede repetirse en la oferta.', 'OFFER_INVALID', 400);
    }
    const variantes = cmd.variantes.map((v) => ({
      idVariante: v.idVariante,
      precioAhora: Money.fromDecimal(v.precioAhora).value,
    }));
    await this.repo.applyOffer(cmd.idProducto, variantes, cmd.idAdmin);
    await this.events.publish({
      tipo: 'CATALOGO_ACTUALIZADO',
      payload: { accion: 'APLICAR_OFERTA', idProducto: cmd.idProducto },
    });
  }
}
