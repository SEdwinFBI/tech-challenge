import { ICommandHandler } from '@/core/cqrs/index';
import { Money } from '@/core/domain/money.vo';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { obtenerEventPublisher } from '@/core/events/event-publisher.factory';
import { env } from '@/core/config/env';
import { DomainError } from '@/core/domain/domain.error';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { claveDesdeUrlCdn } from '../domain/imagen-almacenada';
import { CreateProductCommand, CreateProductResult } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class CreateProductCommandHandler implements ICommandHandler<CreateProductCommand, CreateProductResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly events: IEventPublisher = obtenerEventPublisher(),
  ) {}

  async handle(cmd: CreateProductCommand): Promise<CreateProductResult> {
    if (cmd.imagenUrl && claveDesdeUrlCdn(cmd.imagenUrl, env.CDN_BASE_URL) !== null) {
      throw new DomainError('Sube la imagen una vez creado el producto.', 'IMAGEN_FUENTE_INVALIDA', 400);
    }
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
