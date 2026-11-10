import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { crearEventPublisher } from '@/core/events/event-publisher.factory';
import {
  CANAL_EVENTOS,
  RedisEventPublisher,
  suscribirEventos,
} from '@/core/events/redis-event-publisher';
import { ejecutarConLock } from '@/core/jobs/redis-lock';
import { crearCache } from '@/core/cache/cache.factory';
import { MemoryCache } from '@/core/cache/memory-cache';
import { RedisCache } from '@/core/cache/redis-cache';
import {
  MemoryStreamTicketStore,
  RedisStreamTicketStore,
  crearTicketStore,
} from '@/features/dashboard/domain/stream-ticket.store';

class FakeRedis {
  datos = new Map<string, string>();
  ttl = new Map<string, number>();
  publicados: Array<[string, string]> = [];
  caido = false;
  oyente: ((canal: string, mensaje: string) => void) | null = null;

  private verificar() {
    if (this.caido) throw new Error('redis caido');
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<'OK' | null> {
    this.verificar();
    if (args.includes('NX') && this.datos.has(key)) return null;
    this.datos.set(key, value);
    const modo = args.find((a) => a === 'EX' || a === 'PX');
    if (modo) this.ttl.set(key, Number(args[args.indexOf(modo) + 1]));
    return 'OK';
  }

  async get(key: string) {
    this.verificar();
    return this.datos.get(key) ?? null;
  }

  async getdel(key: string) {
    this.verificar();
    const valor = this.datos.get(key) ?? null;
    this.datos.delete(key);
    return valor;
  }

  async scan(_cursor: string, _m: 'MATCH', pattern: string): Promise<[string, string[]]> {
    this.verificar();
    const prefijo = pattern.replace('*', '');
    return ['0', [...this.datos.keys()].filter((k) => k.startsWith(prefijo))];
  }

  async del(...keys: string[]) {
    this.verificar();
    keys.forEach((k) => this.datos.delete(k));
    return keys.length;
  }

  async publish(canal: string, mensaje: string) {
    this.verificar();
    this.publicados.push([canal, mensaje]);
    this.oyente?.(canal, mensaje);
    return 1;
  }

  async subscribe() {
    return 1;
  }

  on(_evento: 'message', listener: (canal: string, mensaje: string) => void) {
    this.oyente = listener;
    return this;
  }
}

async function sinLog<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => undefined;
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

describe('Ticket del stream en Redis', () => {
  it('se emite con TTL de 30 segundos y se consume una sola vez', async () => {
    const redis = new FakeRedis();
    const store = new RedisStreamTicketStore(redis);
    const { ticket, expiraEnSegundos } = await store.issue();
    assert.equal(expiraEnSegundos, 30);
    assert.equal(redis.ttl.get(`shopcart:ticket:${ticket}`), 30);
    assert.equal(await store.consume(ticket), true);
    assert.equal(await store.consume(ticket), false);
  });

  it('rechaza vacíos y desconocidos, y otra instancia con el mismo Redis lo acepta', async () => {
    const redis = new FakeRedis();
    const a = new RedisStreamTicketStore(redis);
    const b = new RedisStreamTicketStore(redis);
    const { ticket } = await a.issue();
    assert.equal(await b.consume(''), false);
    assert.equal(await b.consume('no-existe'), false);
    assert.equal(await b.consume(ticket), true);
  });

  it('la fábrica elige la implementación según haya Redis', () => {
    assert.ok(crearTicketStore(null) instanceof MemoryStreamTicketStore);
    assert.ok(crearTicketStore(new FakeRedis()) instanceof RedisStreamTicketStore);
  });
});

describe('Fábrica del publicador de eventos', () => {
  it('usa el publicador local sin Redis y el de Redis con Redis', () => {
    assert.ok(crearEventPublisher(null) instanceof LocalEventPublisher);
    assert.ok(crearEventPublisher(new FakeRedis()) instanceof RedisEventPublisher);
  });

  it('publica en el canal, limpia el caché compartido y la suscripción difunde en local', async () => {
    const redis = new FakeRedis();
    const cache = new RedisCache(redis);
    await cache.set('dash_1', { a: 1 }, 180);
    const difundidos: Array<[string, unknown]> = [];
    const local = { invalidateAndBroadcast: (e: string, p: unknown) => void difundidos.push([e, p]) };
    suscribirEventos(redis, local);
    await new RedisEventPublisher(redis, cache, local).publish({ tipo: 'NUEVO_PEDIDO', payload: { idPedido: 7 } });
    assert.equal(redis.publicados[0]?.[0], CANAL_EVENTOS);
    assert.equal(await cache.get('dash_1'), null);
    assert.deepEqual(difundidos, [['NUEVO_PEDIDO', { idPedido: 7 }]]);
  });

  it('si limpiar el caché falla igual publica en Redis y no difunde en local', async () => {
    const redis = new FakeRedis();
    const cacheRoto = {
      get: async () => null,
      set: async () => undefined,
      clear: async () => { throw new Error('clear fallido'); },
    };
    const difundidos: string[] = [];
    const local = { invalidateAndBroadcast: (e: string) => void difundidos.push(e) };
    await sinLog(() =>
      new RedisEventPublisher(redis, cacheRoto, local).publish({ tipo: 'NUEVO_PEDIDO', payload: { idPedido: 9 } })
    );
    assert.equal(redis.publicados.length, 1);
    assert.equal(redis.publicados[0]?.[0], CANAL_EVENTOS);
    assert.deepEqual(difundidos, []);
  });

  it('si Redis falla difunde solo en local y no lanza', async () => {
    const redis = new FakeRedis();
    redis.caido = true;
    const difundidos: string[] = [];
    const local = { invalidateAndBroadcast: (e: string) => void difundidos.push(e) };
    await sinLog(() =>
      new RedisEventPublisher(redis, new RedisCache(redis), local).publish({
        tipo: 'CATALOGO_ACTUALIZADO',
        payload: {},
      })
    );
    assert.deepEqual(difundidos, ['CATALOGO_ACTUALIZADO']);
  });
});

describe('Caché', () => {
  it('guarda JSON con prefijo y TTL, y clear borra solo su prefijo', async () => {
    const redis = new FakeRedis();
    const cache = new RedisCache(redis);
    await cache.set('k', { x: 1 }, 180);
    redis.datos.set('otra:clave', 'v');
    assert.equal(redis.ttl.get('shopcart:cache:k'), 180);
    assert.deepEqual(await cache.get('k'), { x: 1 });
    await cache.clear();
    assert.equal(await cache.get('k'), null);
    assert.equal(redis.datos.has('otra:clave'), true);
  });

  it('una lectura con Redis caído cuenta como fallo de caché', async () => {
    const redis = new FakeRedis();
    redis.caido = true;
    assert.equal(await sinLog(() => new RedisCache(redis).get('k')), null);
  });

  it('la fábrica elige memoria o Redis', () => {
    assert.ok(crearCache(null) instanceof MemoryCache);
    assert.ok(crearCache(new FakeRedis()) instanceof RedisCache);
  });
});

describe('Lock de tareas programadas', () => {
  it('solo una réplica ejecuta la tarea por intervalo', async () => {
    const redis = new FakeRedis();
    let corridas = 0;
    const tarea = async () => void corridas++;
    const a = await ejecutarConLock('job', 55_000, tarea, redis, 'api-1');
    const b = await ejecutarConLock('job', 55_000, tarea, redis, 'api-2');
    assert.deepEqual([a, b], [true, false]);
    assert.equal(corridas, 1);
    assert.equal(redis.datos.get('shopcart:lock:job'), 'api-1');
    assert.equal(redis.ttl.get('shopcart:lock:job'), 55_000);
  });

  it('sin Redis ejecuta siempre', async () => {
    let corridas = 0;
    await ejecutarConLock('job', 1000, async () => void corridas++, null);
    await ejecutarConLock('job', 1000, async () => void corridas++, null);
    assert.equal(corridas, 2);
  });

  it('con Redis caído omite la tarea sin lanzar', async () => {
    const redis = new FakeRedis();
    redis.caido = true;
    let corridas = 0;
    const ejecutada = await sinLog(() => ejecutarConLock('job', 1000, async () => void corridas++, redis, 'api-1'));
    assert.equal(ejecutada, false);
    assert.equal(corridas, 0);
  });
});
