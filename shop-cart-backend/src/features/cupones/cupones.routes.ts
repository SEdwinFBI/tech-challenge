import { Router } from 'express';
import { requireAuth, requireRoles } from '@/core/middlewares/auth.middleware';
import { requireNumericId } from '@/core/middlewares/validate-param.middleware';
import { GetCouponsQueryHandler } from './queries/get-coupons.query';
import { ApplyCouponCommandHandler } from './commands/apply-coupon.command';
import { RemoveCouponCommandHandler } from './commands/remove-coupon.command';
import { SaveCouponCommandHandler } from './commands/save-coupon.command';
import {
  ApplyCouponResult,
  ApplyCouponSchema,
  CouponDTO,
  GetCouponsSchema,
  RemoveCouponResult,
  SaveCouponResult,
  SaveCouponSchema,
} from './models/cupones.schema';

export const cuponesRouter = Router();
const getCouponsQueryHandler = new GetCouponsQueryHandler();
const applyCouponCommandHandler = new ApplyCouponCommandHandler();
const removeCouponCommandHandler = new RemoveCouponCommandHandler();
const saveCouponCommandHandler = new SaveCouponCommandHandler();

cuponesRouter.get('/', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const query = GetCouponsSchema.parse(req.query);
    const datos: CouponDTO[] = await getCouponsQueryHandler.handle(query);
    res.json({ ok: true, datos });
  } catch (err) {
    next(err);
  }
});

cuponesRouter.post('/aplicar', requireAuth, async (req, res, next) => {
  try {
    const { codigo } = ApplyCouponSchema.parse(req.body);
    const data: ApplyCouponResult = await applyCouponCommandHandler.handle({
      codigo,
      idUsuario: req.user!.idUsuario,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

cuponesRouter.delete('/aplicar', requireAuth, async (req, res, next) => {
  try {
    const data: RemoveCouponResult = await removeCouponCommandHandler.handle({
      idUsuario: req.user!.idUsuario,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

cuponesRouter.delete('/remover', requireAuth, async (req, res, next) => {
  try {
    const data: RemoveCouponResult = await removeCouponCommandHandler.handle({
      idUsuario: req.user!.idUsuario,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

cuponesRouter.post('/', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const dto = SaveCouponSchema.parse(req.body);
    const data: SaveCouponResult = await saveCouponCommandHandler.handle({
      ...dto,
      idAdmin: req.user!.idUsuario,
    });
    res.status(201).json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

cuponesRouter.put('/:id', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const dto = SaveCouponSchema.parse(req.body);
    const data: SaveCouponResult = await saveCouponCommandHandler.handle({
      ...dto,
      idCupon: Number(req.params.id),
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});
