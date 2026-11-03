import {
  ApplyCouponResult,
  CouponDTO,
  GetCouponsFilter,
  RemoveCouponResult,
  SaveCouponParams,
  SaveCouponResult,
} from '../models/cupones.model';

export interface ICouponsRepository {
  getAll(filtro?: GetCouponsFilter): Promise<CouponDTO[]>;
  applyToCart(idUsuario: number, codigoCupon: string): Promise<ApplyCouponResult>;
  removeFromCart(idUsuario: number): Promise<RemoveCouponResult>;
  saveCoupon(dto: SaveCouponParams): Promise<SaveCouponResult>;
}
