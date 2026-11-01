import { ICommandHandler } from '@/core/cqrs/index';
import { CouponsRepository } from '../repository/cupones.repository';
import { ICouponsRepository } from '../abstracts/cupones.repository.interface';
import { ApplyCouponCommand, ApplyCouponResult } from '../models/cupones.schema';

export class ApplyCouponCommandHandler implements ICommandHandler<ApplyCouponCommand, ApplyCouponResult> {
  constructor(private readonly repo: ICouponsRepository = new CouponsRepository()) {}

  async handle(cmd: ApplyCouponCommand): Promise<ApplyCouponResult> {
    return this.repo.applyToCart(cmd.idUsuario, cmd.codigo);
  }
}
