import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { EventoDominio, IEventPublisher } from './event-publisher.interface';

export class LocalEventPublisher implements IEventPublisher {
  async publish(evento: EventoDominio): Promise<void> {
    sseCacheManager.invalidateAndBroadcast(evento.tipo, evento.payload);
  }
}
