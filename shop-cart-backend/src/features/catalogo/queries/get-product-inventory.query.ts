import { IQueryHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { ProductInventoryResult } from '../models/catalogo.model';
import { CatalogRepository } from '../repository/catalogo.repository';

export class GetProductInventoryQueryHandler implements IQueryHandler<number, ProductInventoryResult> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(idProducto: number): Promise<ProductInventoryResult> {
    const detail = await this.repo.getProductByIdAdmin(idProducto);
    if (!detail.producto) throw new DomainError('El producto no existe.', 'PRODUCT_NOT_FOUND', 404);

    const { IDProducto, Nombre, Activo } = detail.producto;
    return {
      producto: { IDProducto, Nombre, Activo },
      variantes: detail.variantes.map(v => ({
        IDVariante: v.IDVariante, SKU: v.SKU, Talla: v.Talla, Color: v.Color,
        Presentacion: v.Presentacion, Activo: v.Activo,
        ExistenciaFisica: v.ExistenciaFisica ?? 0,
        UnidadesReservadas: v.UnidadesReservadas ?? 0,
        ExistenciaDisponible: v.ExistenciaDisponible ?? 0,
      })),
    };
  }
}
