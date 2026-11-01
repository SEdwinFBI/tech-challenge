import { Router } from 'express';
import { requireAuth, requireRoles } from '@/core/middlewares/auth.middleware';
import { GetBitacoraQueryHandler } from './queries/get-bitacora.query';
import { BitacoraResult, GetBitacoraSchema } from './models/bitacora.schema';

export const bitacoraRouter = Router();
const getBitacoraQueryHandler = new GetBitacoraQueryHandler();

bitacoraRouter.get('/', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const query = GetBitacoraSchema.parse(req.query);
    const data: BitacoraResult = await getBitacoraQueryHandler.handle(query);

    res.json({
      ok: true,
      ...data,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    });
  } catch (err) {
    next(err);
  }
});
