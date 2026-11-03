import { IQueryHandler } from '@/core/cqrs/index';
import { CouponsRepository } from '../repository/cupones.repository';
import { ICouponsRepository } from '../abstracts/cupones.repository.interface';
import { CouponDTO } from '../models/cupones.model';
import { GetCouponsDTO } from '../models/cupones.schema';

export class GetCouponsQueryHandler implements IQueryHandler<GetCouponsDTO, CouponDTO[]> {
  constructor(private readonly repo: ICouponsRepository = new CouponsRepository()) {}

  async handle(q: GetCouponsDTO): Promise<CouponDTO[]> {
    return this.repo.getAll({ orden: q.orden, direccion: q.direccion, q: q.q, activo: q.activo, vigencia: q.vigencia });
  }
}
