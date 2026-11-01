import {
  ApplyCouponResult,
  CouponDTO,
  RemoveCouponResult,
  SaveCouponParams,
  SaveCouponResult,
} from '../models/cupones.model';

export interface ICouponsRepository {
  getAll(): Promise<CouponDTO[]>;
  applyToCart(idUsuario: number, codigoCupon: string): Promise<ApplyCouponResult>;
  removeFromCart(idUsuario: number): Promise<RemoveCouponResult>;
  saveCoupon(dto: SaveCouponParams): Promise<SaveCouponResult>;
}
