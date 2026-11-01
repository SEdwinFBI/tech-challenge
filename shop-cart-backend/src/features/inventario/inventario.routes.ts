import { Router } from 'express';
import { requireAuth, requireRoles } from '@/core/middlewares/auth.middleware';
import { CreateMovementCommandHandler } from './commands/create-movement.command';
import {
  CreateMovementResult,
  CreateMovementSchema,
  GetKardexSchema,
  KardexResult,
} from './models/inventario.schema';
import { GetKardexQueryHandler } from './queries/get-kardex.query';
import { GetLowStockQueryHandler } from './queries/get-low-stock.query';
import { GetLowStockSchema } from './models/existencias-bajas.model';

export const inventarioRouter = Router();
const getKardexQueryHandler = new GetKardexQueryHandler();
const createMovementCommandHandler = new CreateMovementCommandHandler();

inventarioRouter.get('/kardex', requireAuth, requireRoles('OPERADOR', 'ADMINISTRADOR'), async (req, res, next) => {
  try {
    const query = GetKardexSchema.parse(req.query);
    const data: KardexResult = await getKardexQueryHandler.handle(query);
    res.json({ ok: true, ...data, pagina: query.pagina, tamanoPagina: query.tamanoPagina });
  } catch (err) {
    next(err);
  }
});

inventarioRouter.post('/movimientos', requireAuth, requireRoles('OPERADOR', 'ADMINISTRADOR'), async (req, res, next) => {
  try {
    const dto = CreateMovementSchema.parse(req.body);
    const resultado: CreateMovementResult = await createMovementCommandHandler.handle({
      ...dto,
      idUsuario: req.user!.idUsuario,
      idUsuarioOperador: req.user!.idUsuario,
    });
    res.status(201).json({ ok: true, ...resultado });
  } catch (err) {
    next(err);
  }
});

const getLowStockQueryHandler = new GetLowStockQueryHandler();

inventarioRouter.get('/existencias-bajas', requireAuth, requireRoles('OPERADOR', 'ADMINISTRADOR'), async (req, res, next) => {
  try {
    const query = GetLowStockSchema.parse(req.query);
    const data = await getLowStockQueryHandler.handle(query);
    res.json({ ok: true, ...data, pagina: query.pagina, tamanoPagina: query.tamanoPagina });
  } catch (err) {
    next(err);
  }
});
