import { Router } from 'express';
import { optionalAuth, requireAuth, requireRoles } from '@/core/middlewares/auth.middleware';
import { requireNumericId } from '@/core/middlewares/validate-param.middleware';
import { GetMunicipalitiesQueryHandler } from './queries/get-municipalities.query';
import { GetAddressesQueryHandler } from './queries/get-addresses.query';
import { CreateAddressCommandHandler } from './commands/create-address.command';
import { DeleteAddressCommandHandler } from './commands/delete-address.command';
import { SetDefaultAddressCommandHandler } from './commands/set-default-address.command';
import { ReserveStockCommandHandler } from './commands/reserve-stock.command';
import { ConfirmOrderCommandHandler } from './commands/confirm-order.command';
import { ListPaymentsQueryHandler } from './queries/list-payments.query';
import {
  ConfirmOrderSchema,
  CreateAddressSchema,
  ListPaymentsSchema,
  ReserveStockSchema,
  SetDefaultAddressSchema,
} from './models/checkout.schema';

export const checkoutRouter = Router();

const getMunicipalitiesQueryHandler = new GetMunicipalitiesQueryHandler();
const getAddressesQueryHandler = new GetAddressesQueryHandler();
const createAddressCommandHandler = new CreateAddressCommandHandler();
const deleteAddressCommandHandler = new DeleteAddressCommandHandler();
const setDefaultAddressCommandHandler = new SetDefaultAddressCommandHandler();
const reserveStockCommandHandler = new ReserveStockCommandHandler();
const confirmOrderCommandHandler = new ConfirmOrderCommandHandler();
const listPaymentsQueryHandler = new ListPaymentsQueryHandler();

checkoutRouter.get('/municipios', optionalAuth, async (_req, res, next) => {
  try {
    const municipios = await getMunicipalitiesQueryHandler.handle();
    res.json({ ok: true, datos: municipios });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.get('/direcciones', requireAuth, async (req, res, next) => {
  try {
    const direcciones = await getAddressesQueryHandler.handle({ idUsuario: req.user!.idUsuario });
    res.json({ ok: true, datos: direcciones });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.post('/direcciones', requireAuth, async (req, res, next) => {
  try {
    const dto = CreateAddressSchema.parse(req.body);
    const direcciones = await createAddressCommandHandler.handle({ ...dto, idUsuario: req.user!.idUsuario });
    res.status(201).json({ ok: true, datos: direcciones });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.delete('/direcciones/:id', requireAuth, requireNumericId, async (req, res, next) => {
  try {
    const direcciones = await deleteAddressCommandHandler.handle({
      idDireccion: Number(req.params.id),
      idUsuario: req.user!.idUsuario,
    });
    res.json({ ok: true, datos: direcciones, mensaje: 'Dirección eliminada.' });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.patch('/direcciones/:id/predeterminada', requireAuth, requireNumericId, async (req, res, next) => {
  try {
    const { idDireccion } = SetDefaultAddressSchema.parse({ idDireccion: req.params.id });
    const direcciones = await setDefaultAddressCommandHandler.handle({
      idDireccion,
      idUsuario: req.user!.idUsuario,
    });
    res.json({ ok: true, datos: direcciones, mensaje: 'Dirección predeterminada actualizada.' });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.post('/reservar', requireAuth, async (req, res, next) => {
  try {
    const { idCarrito } = ReserveStockSchema.parse(req.body);
    const reserva = await reserveStockCommandHandler.handle({
      idCarrito,
      idUsuario: req.user!.idUsuario,
    });
    res.json({ ok: true, ...reserva });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.post('/confirmar', requireAuth, async (req, res, next) => {
  try {
    const dto = ConfirmOrderSchema.parse(req.body);
    const resultado = await confirmOrderCommandHandler.handle({
      ...dto,
      idUsuario: req.user!.idUsuario,
    });

    res.status(resultado.FueIdempotente ? 200 : 201).json({ ok: true, ...resultado });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.get('/pagos', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const query = ListPaymentsSchema.parse(req.query);
    const { items, totalRegistros } = await listPaymentsQueryHandler.handle(query);
    res.json({ ok: true, datos: items, total: totalRegistros, pagina: query.pagina, tamanoPagina: query.tamanoPagina });
  } catch (err) {
    next(err);
  }
});
