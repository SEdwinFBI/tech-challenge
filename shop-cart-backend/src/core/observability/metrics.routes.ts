import { Router } from 'express';
import { registro } from '@/core/observability/metrics';

export const metricsRouter = Router();

metricsRouter.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', registro.contentType);
  res.end(await registro.metrics());
});
