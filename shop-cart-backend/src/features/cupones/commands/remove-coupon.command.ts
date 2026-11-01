import { ICommandHandler } from '@/core/cqrs/index';
import { CouponsRepository } from '../repository/cupones.repository';
import { ICouponsRepository } from '../abstracts/cupones.repository.interface';
import { RemoveCouponCommand, RemoveCouponResult } from '../models/cupones.schema';

export class RemoveCouponCommandHandler implements ICommandHandler<RemoveCouponCommand, RemoveCouponResult> {
  constructor(private readonly repo: ICouponsRepository = new CouponsRepository()) {}

  async handle(cmd: RemoveCouponCommand): Promise<RemoveCouponResult> {
    return this.repo.removeFromCart(cmd.idUsuario);
  }
}
