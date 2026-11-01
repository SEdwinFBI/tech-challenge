import { ICommandHandler } from '@/core/cqrs/index';
import { Money } from '@/core/domain/money.vo';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { UpdatePriceCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class UpdatePriceCommandHandler implements ICommandHandler<UpdatePriceCommand, void> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: UpdatePriceCommand): Promise<void> {
    const precioVO = Money.fromDecimal(cmd.nuevoPrecio);
    await this.repo.updateVariantPrice(cmd.idVariante, precioVO.value, cmd.idAdmin);

    sseCacheManager.invalidateAndBroadcast('CATALOGO_ACTUALIZADO', {
      accion: 'ACTUALIZAR_PRECIO',
      idVariante: cmd.idVariante,
      nuevoPrecio: precioVO.value,
    });
  }
}
