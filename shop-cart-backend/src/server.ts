import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from '@/core/config/env';
import { duplicarRedis } from '@/core/config/redis';
import { suscribirEventos } from '@/core/events/redis-event-publisher';
import { docsRouter } from '@/core/http/docs.routes';
import { healthRouter } from '@/core/http/health.routes';
import { iniciarTareasProgramadas } from '@/core/jobs/scheduler';
import { globalErrorHandler } from '@/core/middlewares/error.middleware';
import { instanceHeader } from '@/core/middlewares/instance-header.middleware';
import { requestId } from '@/core/middlewares/request-id.middleware';
import { medirHttp } from '@/core/observability/metrics';
import { metricsRouter } from '@/core/observability/metrics.routes';
import apiRouter from '@/features';
import { ReconcilePaymentsCommandHandler } from '@/features/checkout/commands/reconcile-payments.command';
import { PurgeViewsCommandHandler } from '@/features/recomendaciones/commands/purge-views.command';

const app = express();

if (env.TRUST_PROXY) app.set('trust proxy', Number(env.TRUST_PROXY) || 1);

app.use(instanceHeader);
app.use(requestId);
app.use(medirHttp);
app.use(metricsRouter);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.CORS_ALLOW_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/health', healthRouter);
app.use(docsRouter);
app.use('/api/v1', apiRouter);
app.use(globalErrorHandler);

const purgeViews = new PurgeViewsCommandHandler();
const reconcilePayments = new ReconcilePaymentsCommandHandler();
iniciarTareasProgramadas({
  purgarVistas: () => purgeViews.handle(),
  conciliarPagos: () => reconcilePayments.handle(),
});

const suscriptor = duplicarRedis();
if (suscriptor) suscribirEventos(suscriptor);

app.listen(Number(env.PORT), () => {
  console.log(`Servidor en http://localhost:${env.PORT}`);
  console.log(`Documentación: http://localhost:${env.PORT}/api/docs`);
});
