import { randomBytes } from 'node:crypto';
import { getRedis } from '@/core/config/redis';

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

export interface RedisTicketClient {
  set(key: string, value: string, mode: 'EX', ttl: number, nx: 'NX'): Promise<unknown>;
  getdel(key: string): Promise<string | null>;
}

export class RedisStreamTicketStore implements IStreamTicketStore {
  constructor(private readonly redis: RedisTicketClient) {}

  async issue() {
    const ticket = randomBytes(24).toString('hex');
    const guardado = await this.redis.set(PREFIJO + ticket, '1', 'EX', VIDA_MS / 1000, 'NX');
    if (guardado !== 'OK') throw new Error('No se pudo emitir el ticket');
    return { ticket, expiraEnSegundos: VIDA_MS / 1000 };
  }

  async consume(ticket: string) {
    if (!ticket) return false;
    return (await this.redis.getdel(PREFIJO + ticket)) !== null;
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
