import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { env } from '@/core/config/env';
import { getDbPool } from '@/core/config/db';
import { globalErrorHandler } from '@/core/middlewares/error.middleware';
import { openApiSpec } from '@/core/http/openapi.spec';
import apiRouter from '@/features';
import { ReconcilePaymentsCommandHandler } from '@/features/checkout/commands/reconcile-payments.command';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: env.CORS_ALLOW_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'ShopCart API', ts: new Date().toISOString() })
);


app.get('/api/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpec);
});

app.get(['/api/docs', '/docs'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="es">
  <head>
    <title>Documentación API ShopCart</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="https://scalar.com/favicon.svg" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi.json"
      data-configuration='{"theme":"purple","layout":"modern","hideDarkModeToggle":false,"searchHotKey":"k"}'>
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
});

app.use('/api/v1', apiRouter);
app.use(globalErrorHandler);

cron.schedule('* * * * *', async () => {
  try {
    const pool = await getDbPool();
    await pool.request().execute('SP_Inventario_LimpiarReservasVencidas');
  } catch (err) {
    console.error('Error al limpiar reservas vencidas:', err);
  }
});

const reconcilePayments = new ReconcilePaymentsCommandHandler();
let conciliando = false;
setInterval(async () => {
  if (conciliando) return;
  conciliando = true;
  try {
    await reconcilePayments.handle();
  } catch (err) {
    console.error('Error al conciliar pagos:', err);
  } finally {
    conciliando = false;
  }
}, 60_000).unref();

app.listen(Number(env.PORT), () => {
  console.log(`Servidor en http://localhost:${env.PORT}`);
  console.log(`Documentación: http://localhost:${env.PORT}/api/docs`);
});
