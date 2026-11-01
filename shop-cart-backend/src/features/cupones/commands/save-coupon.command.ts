import { ICommandHandler } from '@/core/cqrs/index';
import { CouponPolicy } from '../domain/coupon.policy';
import { CouponsRepository } from '../repository/cupones.repository';
import { ICouponsRepository } from '../abstracts/cupones.repository.interface';
import { SaveCouponCommand, SaveCouponResult } from '../models/cupones.schema';

export class SaveCouponCommandHandler implements ICommandHandler<SaveCouponCommand, SaveCouponResult> {
  constructor(private readonly repo: ICouponsRepository = new CouponsRepository()) {}

  async handle(cmd: SaveCouponCommand): Promise<SaveCouponResult> {
    CouponPolicy.validateCreationRules({
      tipoDescuento: cmd.tipoDescuento,
      valor: cmd.valor,
      montoMinimoCompra: cmd.montoMinimoCompra,
      fechaInicio: cmd.fechaInicio,
      fechaFin: cmd.fechaFin,
    });

    return this.repo.saveCoupon(cmd);
  }
}
