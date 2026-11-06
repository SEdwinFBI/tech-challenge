import { Router } from 'express';
import { optionalAuthLenient } from '@/core/middlewares/auth.middleware';
import { recommendationRateLimiter } from '@/core/middlewares/rate-limit.middleware';
import { GetRecommendationsSchema, GetSearchRecommendationSchema, RecordRecommendationViewSchema } from './models/recomendaciones.schema';
import { GetRecommendationsQueryHandler } from './queries/get-recommendations.query';
import { GetSearchRecommendationQueryHandler } from './queries/get-search-recommendation.query';
import { RecordViewCommandHandler } from './commands/record-view.command';

export const recomendacionesRouter = Router();
const getRecommendationsQueryHandler = new GetRecommendationsQueryHandler();
const getSearchRecommendationQueryHandler = new GetSearchRecommendationQueryHandler();
const recordViewCommandHandler = new RecordViewCommandHandler();

recomendacionesRouter.post('/vistas', optionalAuthLenient, recommendationRateLimiter, async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'private, no-store');
    const dto = RecordRecommendationViewSchema.parse(req.body);
    await recordViewCommandHandler.handle({
      ...dto,
      idUsuario: req.user?.idUsuario,
      tokenInvitado: req.headers['x-guest-token'] as string | undefined,
    });
    res.status(204).end();
  } catch (err) { next(err); }
});

recomendacionesRouter.get('/', optionalAuthLenient, recommendationRateLimiter, async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'private, no-store');
    const dto = GetRecommendationsSchema.parse(req.query);
    const result = await getRecommendationsQueryHandler.handle({
      ...dto,
      idUsuario: req.user?.idUsuario,
      tokenInvitado: req.headers['x-guest-token'] as string | undefined,
    });
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

recomendacionesRouter.get('/busqueda', optionalAuthLenient, recommendationRateLimiter, async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'private, no-store');
    const dto = GetSearchRecommendationSchema.parse(req.query);
    const result = await getSearchRecommendationQueryHandler.handle(dto);
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});
