import rateLimit from 'express-rate-limit';
import { RedisStore, RedisReply } from 'rate-limit-redis';
import { env } from '@/core/config/env';
import { getRedis } from '@/core/config/redis';

const windowMinutes = Number(env.RATE_LIMIT_AUTH_WINDOW_MIN);
const maxRequests = Number(env.RATE_LIMIT_AUTH_MAX);
const redis = getRedis();
let conectado = false;
redis?.once('ready', () => {
  conectado = true;
});

async function esperarConexion(): Promise<void> {
  if (!redis || redis.status === 'ready') return;
  await new Promise<void>((resolver, rechazar) => {
    const espera = setTimeout(() => rechazar(new Error('Redis no está listo')), 5000);
    redis.once('ready', () => {
      clearTimeout(espera);
      resolver();
    });
  });
}

export const authRateLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...(redis
    ? {
        store: new RedisStore({
          prefix: 'shopcart:rl:',
          sendCommand: async (...args: string[]) => {
            if (!conectado && args[0]?.toUpperCase() === 'SCRIPT') await esperarConexion();
            return redis.call(args[0] as string, ...args.slice(1)) as Promise<RedisReply>;
          },
        }),
      }
    : {}),
  message: {
    ok: false,
    codigo: 'TOO_MANY_REQUESTS',
    mensaje: `Demasiados intentos. Intenta de nuevo en ${windowMinutes} minutos.`,
  },
});
