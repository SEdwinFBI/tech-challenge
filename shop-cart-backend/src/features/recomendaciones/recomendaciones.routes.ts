import { Router } from 'express';
import { optionalAuth } from '@/core/middlewares/auth.middleware';
import { recommendationRateLimiter } from '@/core/middlewares/rate-limit.middleware';
import { GetRecommendationsSchema, GetSearchRecommendationSchema, RecordRecommendationViewSchema } from './models/recomendaciones.schema';
import { resolveRecommendationOwner } from './http/recommendation-owner';
import { getRecommendations, getSearchRecommendation, recordRecommendationView } from './recomendaciones.dependencies';

export const recomendacionesRouter = Router();

recomendacionesRouter.use(optionalAuth);
recomendacionesRouter.use(recommendationRateLimiter);
recomendacionesRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
recomendacionesRouter.post('/vistas', async (req, res, next) => {
  try {
    const { idProducto } = RecordRecommendationViewSchema.parse(req.body);
    await recordRecommendationView.handle(resolveRecommendationOwner(req), idProducto);
    res.status(204).end();
  } catch (err) { next(err); }
});
recomendacionesRouter.get('/', async (req, res, next) => {
  try {
    const query = GetRecommendationsSchema.parse(req.query);
    const { idCategoria, precioMin, precioMax, q } = query;
    const result = await getRecommendations.handle(resolveRecommendationOwner(req), query.idProducto, query.contexto, { idCategoria, precioMin, precioMax, q });
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

recomendacionesRouter.get('/busqueda', async (req, res, next) => {
  try {
    const result = await getSearchRecommendation.handle(GetSearchRecommendationSchema.parse(req.query));
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});
