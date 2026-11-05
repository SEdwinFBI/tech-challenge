import { randomBytes } from 'node:crypto';
import { getRedis } from '@/core/config/redis';
import { DomainError } from '@/core/domain/domain.error';

const VIDA_MS = 30_000;
const PREFIJO = 'shopcart:ticket:';

export interface IStreamTicketStore {
  issue(now?: number): Promise<{ ticket: string; expiraEnSegundos: number }>;
  consume(ticket: string, now?: number): Promise<boolean>;
}

export class MemoryStreamTicketStore implements IStreamTicketStore {
  private readonly tickets = new Map<string, number>();

  async issue(now = Date.now()) {
    for (const [ticket, expira] of this.tickets) {
      if (expira <= now) this.tickets.delete(ticket);
    }
    const ticket = randomBytes(24).toString('hex');
    this.tickets.set(ticket, now + VIDA_MS);
    return { ticket, expiraEnSegundos: VIDA_MS / 1000 };
  }

  async consume(ticket: string, now = Date.now()) {
    const expira = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    return expira !== undefined && expira > now;
  }
}

const tiempoRealNoDisponible = () =>
  new DomainError('El tiempo real no está disponible por ahora.', 'TIEMPO_REAL_NO_DISPONIBLE', 503);

export interface RedisTicketClient {
  set(key: string, value: string, mode: 'EX', ttl: number, nx: 'NX'): Promise<unknown>;
  getdel(key: string): Promise<string | null>;
}

export class RedisStreamTicketStore implements IStreamTicketStore {
  constructor(private readonly redis: RedisTicketClient) {}

  async issue() {
    const ticket = randomBytes(24).toString('hex');
    let guardado: unknown;
    try {
      guardado = await this.redis.set(PREFIJO + ticket, '1', 'EX', VIDA_MS / 1000, 'NX');
    } catch {
      throw tiempoRealNoDisponible();
    }
    if (guardado !== 'OK') throw tiempoRealNoDisponible();
    return { ticket, expiraEnSegundos: VIDA_MS / 1000 };
  }

  async consume(ticket: string) {
    if (!ticket) return false;
    try {
      return (await this.redis.getdel(PREFIJO + ticket)) !== null;
    } catch {
      throw tiempoRealNoDisponible();
    }
  }
}

export function crearTicketStore(redis: RedisTicketClient | null = getRedis()): IStreamTicketStore {
  return redis ? new RedisStreamTicketStore(redis) : new MemoryStreamTicketStore();
}

let store: IStreamTicketStore | null = null;

function obtenerStore(): IStreamTicketStore {
  if (!store) store = crearTicketStore();
  return store;
}

export function issueStreamTicket(now?: number) {
  return obtenerStore().issue(now);
}

export function consumeStreamTicket(ticket: string, now?: number) {
  return obtenerStore().consume(ticket, now);
}
