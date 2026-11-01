import { IQueryHandler } from '@/core/cqrs/index';
import { CouponsRepository } from '../repository/cupones.repository';
import { ICouponsRepository } from '../abstracts/cupones.repository.interface';
import { CouponDTO } from '../models/cupones.model';

export class GetCouponsQueryHandler implements IQueryHandler<void, CouponDTO[]> {
  constructor(private readonly repo: ICouponsRepository = new CouponsRepository()) {}

  async handle(): Promise<CouponDTO[]> {
    return this.repo.getAll();
  }
}
