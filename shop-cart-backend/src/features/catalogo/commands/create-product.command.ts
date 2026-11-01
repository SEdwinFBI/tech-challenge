import { ICommandHandler } from '@/core/cqrs/index';
import { Money } from '@/core/domain/money.vo';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { CreateProductCommand, CreateProductResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class CreateProductCommandHandler implements ICommandHandler<CreateProductCommand, CreateProductResult> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: CreateProductCommand): Promise<CreateProductResult> {
    const precioVO = Money.fromDecimal(cmd.precio);
    const data = await this.repo.createProductWithVariant({
      ...cmd,
      precio: precioVO.value,
    });

    sseCacheManager.invalidateAndBroadcast('CATALOGO_ACTUALIZADO', {
      accion: 'CREAR_PRODUCTO',
      idProducto: data?.IDProducto,
    });

    return data;
  }
}
