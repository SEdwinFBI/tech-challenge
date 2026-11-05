import { obtenerCache } from '@/core/cache/cache.factory';
import { getRedis } from '@/core/config/redis';
import { IEventPublisher } from './event-publisher.interface';
import { LocalEventPublisher } from './local-event-publisher';
import { RedisEventPublisher, RedisPublicador } from './redis-event-publisher';

export function crearEventPublisher(redis: RedisPublicador | null = getRedis()): IEventPublisher {
  return redis ? new RedisEventPublisher(redis, obtenerCache()) : new LocalEventPublisher();
}

let instancia: IEventPublisher | null = null;

export function obtenerEventPublisher(): IEventPublisher {
  if (!instancia) instancia = crearEventPublisher();
  return instancia;
}
