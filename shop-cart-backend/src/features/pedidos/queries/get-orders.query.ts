import { IQueryHandler } from '@/core/cqrs/index';
import { IOrdersRepository } from '../abstracts/pedidos.repository.interface';
import { GetOrdersQuery, GetOrdersResult } from '../models/pedidos.schema';
import { OrdersRepository } from '../repository/pedidos.repository';

export class GetOrdersQueryHandler implements IQueryHandler<GetOrdersQuery, GetOrdersResult> {
  constructor(private readonly repo: IOrdersRepository = new OrdersRepository()) {}

  async handle(q: GetOrdersQuery): Promise<GetOrdersResult> {
    const idUsuarioFiltro = q.solicitante.rol === 'CLIENTE' ? q.solicitante.idUsuario : q.idCliente ?? null;
    return this.repo.getAllPaginated({
      idUsuarioFiltro,
      estado: q.estado ?? null,
      fechaInicio: q.fechaDesde ?? q.fechaInicio ?? null,
      fechaFin: q.fechaHasta ?? q.fechaFin ?? null,
      cliente: q.cliente || null,
      totalMin: q.totalMin ?? null,
      totalMax: q.totalMax ?? null,
      pagina: q.pagina,
      tamanoPagina: q.tamanoPagina,
      busqueda: q.numeroSeguimiento ? q.numeroSeguimiento : null,
      orden: q.orden,
      direccion: q.direccion,
    });
  }
}
