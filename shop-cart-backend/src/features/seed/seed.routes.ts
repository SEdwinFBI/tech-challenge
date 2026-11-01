import { Router } from 'express';
import { ApplySeedCommandHandler } from './commands/apply-seed.command';

export const seedRouter = Router();
const applySeedCommandHandler = new ApplySeedCommandHandler();

seedRouter.post('/', async (_req, res, next) => {
  try {
    const resultado = await applySeedCommandHandler.handle();

    res.status(200).json({
      ok: true,
      mensaje: 'Datos de ejemplo cargados.',
      detalles: resultado,
    });
  } catch (err) {
    next(err);
  }
});

export default seedRouter;
