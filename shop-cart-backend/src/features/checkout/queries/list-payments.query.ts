import { IQueryHandler } from '@/core/cqrs/index';
import { IPaymentsRepository } from '../abstracts/payments.repository.interface';
import { ListPaymentsQuery } from '../models/checkout.schema';
import { ListPaymentsResult } from '../models/payments.model';
import { PaymentsRepository } from '../repository/payments.repository';

export class ListPaymentsQueryHandler implements IQueryHandler<ListPaymentsQuery, ListPaymentsResult> {
  constructor(private readonly payments: IPaymentsRepository = new PaymentsRepository()) {}

  async handle(q: ListPaymentsQuery): Promise<ListPaymentsResult> {
    return this.payments.listar({
      estado: q.estado ?? null,
      pagina: q.pagina,
      tamanoPagina: q.tamanoPagina,
      direccion: q.direccion,
    });
  }
}
