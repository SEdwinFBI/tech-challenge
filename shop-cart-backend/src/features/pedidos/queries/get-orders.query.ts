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
      fechaInicio: q.fechaInicio ?? null,
      fechaFin: q.fechaFin ?? null,
      pagina: q.pagina,
      tamanoPagina: q.tamanoPagina,
      busqueda: q.numeroSeguimiento ? q.numeroSeguimiento : null,
    });
  }
}
