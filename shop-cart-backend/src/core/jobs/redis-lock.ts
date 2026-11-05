import { instanceId } from '@/core/config/instance';
import { getRedis } from '@/core/config/redis';

export interface RedisLockClient {
  set(key: string, value: string, px: 'PX', ttl: number, nx: 'NX'): Promise<unknown>;
}

export async function ejecutarConLock(
  nombre: string,
  ttlMs: number,
  tarea: () => Promise<void>,
  redis: RedisLockClient | null = getRedis(),
  propietario: string = instanceId
): Promise<boolean> {
  if (redis) {
    try {
      const adquirido = await redis.set(`shopcart:lock:${nombre}`, propietario, 'PX', ttlMs, 'NX');
      if (adquirido !== 'OK') return false;
    } catch (err) {
      console.error(`No se pudo tomar el lock ${nombre}:`, (err as Error).message);
      return false;
    }
  }
  await tarea();
  return true;
}
