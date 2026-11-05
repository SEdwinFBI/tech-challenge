import { ICache } from '@/core/cache/cache.interface';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { EventoDominio, IEventPublisher } from './event-publisher.interface';

export const CANAL_EVENTOS = 'shopcart:eventos';

export interface BroadcastLocal {
  invalidateAndBroadcast(event: string, payload: unknown): void;
}

export interface RedisPublicador {
  publish(channel: string, message: string): Promise<number>;
}

export interface RedisSuscriptor {
  subscribe(channel: string): Promise<unknown>;
  on(event: 'message', listener: (channel: string, message: string) => void): unknown;
}

export class RedisEventPublisher implements IEventPublisher {
  constructor(
    private readonly redis: RedisPublicador,
    private readonly cache: ICache,
    private readonly local: BroadcastLocal = sseCacheManager
  ) {}

  async publish(evento: EventoDominio): Promise<void> {
    try {
      await this.cache.clear();
      await this.redis.publish(CANAL_EVENTOS, JSON.stringify(evento));
    } catch (err) {
      console.error('No se pudo publicar el evento en Redis, se difunde solo en esta instancia:', (err as Error).message);
      this.local.invalidateAndBroadcast(evento.tipo, evento.payload);
    }
  }
}

export function suscribirEventos(redis: RedisSuscriptor, local: BroadcastLocal = sseCacheManager): void {
  redis.on('message', (canal, mensaje) => {
    if (canal !== CANAL_EVENTOS) return;
    try {
      const evento = JSON.parse(mensaje) as EventoDominio;
      local.invalidateAndBroadcast(evento.tipo, evento.payload);
    } catch (err) {
      console.error('Evento de Redis inválido:', (err as Error).message);
    }
  });
  redis.subscribe(CANAL_EVENTOS).catch((err: Error) => console.error('No se pudo suscribir a Redis:', err.message));
}
