import { ICommandHandler } from '@/core/cqrs/index';
import { Money } from '@/core/domain/money.vo';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { UpdateVariantCommand, UpdateVariantResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class UpdateVariantCommandHandler implements ICommandHandler<UpdateVariantCommand, UpdateVariantResult> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: UpdateVariantCommand): Promise<UpdateVariantResult> {
    const precio = cmd.precio !== undefined ? Money.fromDecimal(cmd.precio).value : undefined;

    const data = await this.repo.updateVariant({
      ...cmd,
      precio,
    });

    sseCacheManager.invalidateAndBroadcast('CATALOGO_ACTUALIZADO', {
      accion: 'ACTUALIZAR_VARIANTE',
      idVariante: cmd.idVariante,
    });

    return data;
  }
}
