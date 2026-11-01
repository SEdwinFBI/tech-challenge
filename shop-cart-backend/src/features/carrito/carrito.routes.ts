import { Router } from 'express';
import { optionalAuth } from '@/core/middlewares/auth.middleware';
import { parseIdParam } from '@/core/middlewares/validate-param.middleware';
import { GetCartQueryHandler } from './queries/get-cart.query';
import { UpsertCartItemCommandHandler } from './commands/upsert-cart-item.command';
import { UpsertCartItemSchema } from './models/carrito.schema';

export const carritoRouter = Router();
const getCartQueryHandler = new GetCartQueryHandler();
const upsertCartItemCommandHandler = new UpsertCartItemCommandHandler();

carritoRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const guestToken = req.headers['x-guest-token'] as string | undefined;
    const data = await getCartQueryHandler.handle({
      idUsuario: req.user?.idUsuario,
      tokenInvitado: guestToken,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

carritoRouter.post('/items', optionalAuth, async (req, res, next) => {
  try {
    const guestToken = req.headers['x-guest-token'] as string | undefined;
    const dto = UpsertCartItemSchema.parse(req.body);

    const actualizado = await upsertCartItemCommandHandler.handle({
      ...dto,
      idUsuario: req.user?.idUsuario,
      tokenInvitado: guestToken,
    });

    res.json({ ok: true, ...actualizado });
  } catch (err) {
    next(err);
  }
});

carritoRouter.delete('/items/:idVariante', optionalAuth, parseIdParam('idVariante'), async (req, res, next) => {
  try {
    const guestToken = req.headers['x-guest-token'] as string | undefined;
    const data = await upsertCartItemCommandHandler.handle({
      idVariante: Number(req.params.idVariante),
      cantidad: 0,
      idUsuario: req.user?.idUsuario,
      tokenInvitado: guestToken,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});
