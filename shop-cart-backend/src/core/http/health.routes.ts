import { Router } from 'express';
import { getDbPool } from '@/core/config/db';
import { instanceId } from '@/core/config/instance';
import { getRedis } from '@/core/config/redis';

type Verificacion = () => Promise<unknown>;

export interface HealthDeps {
  instancia: string;
  verificaciones: () => Record<string, Verificacion>;
}

const verificacionesPorDefecto = (): Record<string, Verificacion> => {
  const redis = getRedis();
  return {
    sql: async () => {
      const pool = await getDbPool();
      await pool.request().execute('SP_Sistema_Ping');
    },
    ...(redis ? { redis: () => redis.ping() } : {}),
  };
};

export const crearHealthRouter = (
  deps: HealthDeps = { instancia: instanceId, verificaciones: verificacionesPorDefecto },
): Router => {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ ok: true, service: 'ShopCart API', ts: new Date().toISOString() });
  });

  router.get('/listo', async (_req, res) => {
    const estado: Record<string, string> = {};
    for (const [nombre, verificar] of Object.entries(deps.verificaciones())) {
      try {
        await verificar();
        estado[nombre] = 'ok';
      } catch {
        estado[nombre] = 'error';
      }
    }
    const ok = Object.values(estado).every((v) => v === 'ok');
    res.status(ok ? 200 : 503).json({ ok, instancia: deps.instancia, ...estado });
  });

  return router;
};

export const healthRouter = crearHealthRouter();
