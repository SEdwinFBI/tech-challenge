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

function sharedStore(prefix: string) {
  return redis
    ? {
        store: new RedisStore({
          prefix,
          sendCommand: async (...args: string[]) => {
            if (!conectado && args[0]?.toUpperCase() === 'SCRIPT') await esperarConexion();
            return redis.call(args[0] as string, ...args.slice(1)) as Promise<RedisReply>;
          },
        }),
      }
    : {};
}

export const recommendationRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...sharedStore('shopcart:rl:recomendaciones:'),
  message: { ok: false, codigo: 'TOO_MANY_REQUESTS', mensaje: 'Espera un momento para actualizar tus recomendaciones.' },
});

export const authRateLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  ...sharedStore('shopcart:rl:'),
  message: {
    ok: false,
    codigo: 'TOO_MANY_REQUESTS',
    mensaje: `Demasiados intentos. Intenta de nuevo en ${windowMinutes} minutos.`,
  },
});
