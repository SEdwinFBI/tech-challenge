import { Router } from 'express';
import { requireAuth, requireRoles } from '@/core/middlewares/auth.middleware';
import { requireNumericId } from '@/core/middlewares/validate-param.middleware';
import { GetOrdersQueryHandler } from './queries/get-orders.query';
import { GetOrderByIdQueryHandler } from './queries/get-order-by-id.query';
import { UpdateOrderStatusCommandHandler } from './commands/update-order-status.command';
import { ReturnOrderLineCommandHandler } from './commands/return-order-line.command';
import {
  GetOrdersSchema,
  ReturnOrderLineSchema,
  UpdateOrderStatusSchema,
} from './models/pedidos.schema';

export const pedidosRouter = Router();

const getOrdersQueryHandler = new GetOrdersQueryHandler();
const getOrderByIdQueryHandler = new GetOrderByIdQueryHandler();
const updateOrderStatusCommandHandler = new UpdateOrderStatusCommandHandler();
const returnOrderLineCommandHandler = new ReturnOrderLineCommandHandler();

pedidosRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const query = GetOrdersSchema.parse(req.query);
    const resultado = await getOrdersQueryHandler.handle({ ...query, solicitante: req.user! });
    res.json({ ok: true, datos: resultado.items, total: resultado.totalRegistros, pagina: query.pagina, tamanoPagina: query.tamanoPagina });
  } catch (err) {
    next(err);
  }
});

pedidosRouter.get('/:id', requireAuth, requireNumericId, async (req, res, next) => {
  try {
    const resultado = await getOrderByIdQueryHandler.handle({
      idPedido: Number(req.params.id),
      solicitante: req.user!,
    });
    res.json({ ok: true, pedido: resultado.pedido, detalles: resultado.detalles, historial: resultado.historial });
  } catch (err) {
    next(err);
  }
});

pedidosRouter.patch('/:id/estado', requireAuth, requireNumericId, async (req, res, next) => {
  try {
    const body = UpdateOrderStatusSchema.parse({ ...req.body, idPedido: req.params.id });
    const data = await updateOrderStatusCommandHandler.handle({
      ...body,
      ejecutor: req.user!,
    });
    res.json({ ok: true, idPedido: data.idPedido, estado: data.estado });
  } catch (err) {
    next(err);
  }
});

pedidosRouter.post('/:id/devoluciones', requireAuth, requireRoles('OPERADOR', 'ADMINISTRADOR'), async (req, res, next) => {
  try {
    const body = ReturnOrderLineSchema.parse({ ...req.body, idPedido: req.params.id });
    const data = await returnOrderLineCommandHandler.handle({
      ...body,
      idOperador: req.user!.idUsuario,
    });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});
