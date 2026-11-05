import Redis from 'ioredis';
import { env } from './env';

let client: Redis | null = null;

function crearCliente(): Redis {
  const redis = new Redis(env.REDIS_URL as string, {
    retryStrategy: (intentos) => Math.min(intentos * 200, 5000),
    maxRetriesPerRequest: 1,
    commandTimeout: 1500,
  });
  redis.on('error', (err) => console.error('Redis:', err.message));
  return redis;
}

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!client) client = crearCliente();
  return client;
}

export function duplicarRedis(): Redis | null {
  const base = getRedis();
  if (!base) return null;
  const copia = base.duplicate({ commandTimeout: undefined });
  copia.on('error', (err) => console.error('Redis (suscripción):', err.message));
  return copia;
}
